import type { GpuLayerCatalogEntry, GpuLayerConfig } from '@/lib/layerConfig/gpuLayerConfig'
import {
  catalogEntryMatchesFamily,
  ficheCatalogVisibilityRevision,
  isFicheDocumentFamilyVisible,
} from '@/lib/fiche/ficheCatalogVisibilityFilter'
import { coerceDisplayString } from '@/lib/coerceDisplayString'
import type { ParcelFicheFeature } from '@/lib/fiche/parcelFicheFromGpuApi'

export type RuleSectionDu = 'zonage' | 'prescription' | 'information' | 'secteur'

export type FicheDuRuleCatalogScope = {
  /** Sous-ensemble actif : au moins une feuille DU typée cochée. */
  restricted: boolean
  zonage: boolean
  secteur: boolean
  prescriptions: boolean
  prescriptionTypepsc: Set<string>
  informations: boolean
  informationTypeinf: Set<string>
}

let activeSupTypes: Set<string> | null = null
let activeDuRuleScope: FicheDuRuleCatalogScope | null = null

export function setFicheCatalogSupTypes(types: Set<string> | null): void {
  activeSupTypes = types
  ficheCatalogVisibilityRevision.value += 1
}

export function setFicheCatalogDuRuleScope(scope: FicheDuRuleCatalogScope | null): void {
  activeDuRuleScope = scope
  ficheCatalogVisibilityRevision.value += 1
}

export function getFicheCatalogSupTypes(): Set<string> | null {
  return activeSupTypes
}

function normalizeSupTypeList(config: GpuLayerConfig): string[] {
  const raw = config.supType
  if (!Array.isArray(raw)) return []
  return raw.map((v) => (typeof v === 'string' ? v.trim().toUpperCase() : '')).filter(Boolean)
}

function duLayerNameHintsZonage(config: GpuLayerConfig): boolean {
  const name = (config.name ?? '').toLowerCase()
  return name.includes('zone_secteur') || name.includes('zonage')
}

function duLayerNameHintsSecteur(config: GpuLayerConfig): boolean {
  const name = (config.name ?? '').toLowerCase()
  return name.includes('zone_secteur') || name.includes('secteur')
}

function duLayerNameHintsInformation(config: GpuLayerConfig): boolean {
  const name = (config.name ?? '').toLowerCase()
  return name.includes('info')
}

function duLayerNameHintsPrescription(config: GpuLayerConfig): boolean {
  const name = (config.name ?? '').toLowerCase()
  return name.includes('prescription')
}

function stackableSupEntries(
  catalogChecked: Record<string, boolean>,
  entries: GpuLayerCatalogEntry[],
): GpuLayerCatalogEntry[] {
  return entries.filter((entry) => {
    if (!catalogChecked[entry.id]) return false
    const types = normalizeSupTypeList(entry.config)
    if (!types.length) return false
    return Boolean(entry.config.name?.trim())
  })
}

/** Union des `supType` des couches SUP cochées (feuilles avec supType). `null` = pas de filtre sous-type. */
export function computeActiveSupTypesFromCatalog(
  catalogChecked: Record<string, boolean>,
  entries: GpuLayerCatalogEntry[],
): Set<string> | null {
  const checked = stackableSupEntries(catalogChecked, entries)
  if (!checked.length) return null
  const out = new Set<string>()
  for (const entry of checked) {
    for (const code of normalizeSupTypeList(entry.config)) {
      out.add(code)
    }
  }
  return out.size ? out : null
}

export function isSupCategoryCatalogVisible(code: string): boolean {
  if (!isFicheDocumentFamilyVisible('sup')) return false
  const key = code.trim().toUpperCase()
  if (!key) return true
  if (!activeSupTypes?.size) return true
  return activeSupTypes.has(key)
}

function mergeFilterValues(target: Set<string>, values: string[] | undefined): void {
  if (!values?.length) return
  for (const v of values) {
    const n = v.trim().toUpperCase()
    if (n) target.add(n)
  }
}

function duCatalogEntryIsCheckedLeaf(
  catalogChecked: Record<string, boolean>,
  entry: GpuLayerCatalogEntry,
): boolean {
  if (!catalogChecked[entry.id]) return false
  return catalogEntryMatchesFamily({ id: entry.id, path: entry.path }, 'du')
}

export function computeDuRuleCatalogScope(
  catalogChecked: Record<string, boolean>,
  entries: GpuLayerCatalogEntry[],
): FicheDuRuleCatalogScope | null {
  const checkedDu = entries.filter((e) => duCatalogEntryIsCheckedLeaf(catalogChecked, e))
  if (!checkedDu.length) return null

  const scope: FicheDuRuleCatalogScope = {
    restricted: false,
    zonage: false,
    secteur: false,
    prescriptions: false,
    prescriptionTypepsc: new Set(),
    informations: false,
    informationTypeinf: new Set(),
  }

  let sawLeafConstraint = false

  for (const entry of checkedDu) {
    const config = entry.config
    const attr = config.filterAttribute?.trim()
    const values = config.filterValue

    if (attr === 'typepsc' && values?.length) {
      sawLeafConstraint = true
      scope.restricted = true
      scope.prescriptions = true
      mergeFilterValues(scope.prescriptionTypepsc, values)
      continue
    }
    if (attr === 'typeinf' && values?.length) {
      sawLeafConstraint = true
      scope.restricted = true
      scope.informations = true
      mergeFilterValues(scope.informationTypeinf, values)
      continue
    }
    if (attr === 'typezone' && values?.length) {
      sawLeafConstraint = true
      scope.restricted = true
      scope.zonage = true
      continue
    }
    if (attr === 'typesect' && values?.length) {
      sawLeafConstraint = true
      scope.restricted = true
      scope.secteur = true
      continue
    }

    if (!attr) {
      if (duLayerNameHintsZonage(config)) {
        sawLeafConstraint = true
        scope.restricted = true
        scope.zonage = true
      }
      if (duLayerNameHintsSecteur(config)) {
        sawLeafConstraint = true
        scope.restricted = true
        scope.secteur = true
      }
      if (duLayerNameHintsInformation(config)) {
        sawLeafConstraint = true
        scope.restricted = true
        scope.informations = true
      }
      if (duLayerNameHintsPrescription(config)) {
        sawLeafConstraint = true
        scope.restricted = true
        scope.prescriptions = true
      }
    }
  }

  return sawLeafConstraint ? scope : null
}

export function duRuleFeatureMatchesCatalogScope(
  feature: ParcelFicheFeature,
  section: RuleSectionDu,
): boolean {
  const scope = activeDuRuleScope
  if (!scope?.restricted) return true
  const props = feature.properties ?? {}

  if (section === 'zonage') {
    return scope.zonage
  }
  if (section === 'secteur') {
    return scope.secteur
  }
  if (section === 'prescription') {
    if (!scope.prescriptions) return false
    if (!scope.prescriptionTypepsc.size) return true
    const code = coerceDisplayString(props.typepsc).toUpperCase()
    return scope.prescriptionTypepsc.has(code)
  }
  if (section === 'information') {
    if (!scope.informations) return false
    if (!scope.informationTypeinf.size) return true
    const code = coerceDisplayString(props.typeinf).toUpperCase()
    return scope.informationTypeinf.has(code)
  }
  return true
}

export function syncFicheCatalogLayerScopes(
  catalogChecked: Record<string, boolean>,
  catalogEntries: GpuLayerCatalogEntry[],
): void {
  setFicheCatalogSupTypes(computeActiveSupTypesFromCatalog(catalogChecked, catalogEntries))
  setFicheCatalogDuRuleScope(computeDuRuleCatalogScope(catalogChecked, catalogEntries))
}

export function resetFicheCatalogLayerScopes(): void {
  activeSupTypes = null
  activeDuRuleScope = null
}

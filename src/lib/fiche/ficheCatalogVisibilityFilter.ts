import { shallowRef } from 'vue'
import { branchForCatalogSubtree } from '@/lib/layerConfig/documentCatalogVisibility'
import { getMapPermalinkParams } from '@/lib/map/mapPermalink'
import type { TreeLayerNode } from '@/types/treeLayerNode'

export type FicheDocumentFamily = 'du' | 'psmv' | 'sup' | 'scot' | 'mec'

const FICHE_DOCUMENT_FAMILIES: FicheDocumentFamily[] = ['du', 'psmv', 'sup', 'scot', 'mec']

export type CatalogEntryForFicheVisibility = {
  id: string
  path: string
  permalinkId?: string
}

/** État catalogue courant (cases cochées), prioritaire sur le permalink (debounce hash). */
let catalogFamilyVisibility: Record<FicheDocumentFamily, boolean> | null = null

/** Incrémenté à chaque sync catalogue → recomposer le HTML parcelle (Documents). */
export const ficheCatalogVisibilityRevision = shallowRef(0)

export function setFicheCatalogFamilyVisibility(
  map: Record<FicheDocumentFamily, boolean> | null,
): void {
  catalogFamilyVisibility = map
  ficheCatalogVisibilityRevision.value += 1
}

function catalogHaystack(entry: CatalogEntryForFicheVisibility): string {
  return `${entry.path}|${entry.id}|${entry.permalinkId ?? ''}`.toLowerCase()
}

function catalogEntryMatchesFamily(
  entry: CatalogEntryForFicheVisibility,
  family: FicheDocumentFamily,
): boolean {
  const id = entry.id.toLowerCase()
  const path = entry.path.toLowerCase()
  const hay = catalogHaystack(entry)

  if (family === 'scot') {
    if (id.includes('mec') || path.includes('/mec')) return false
    return id.includes('scot') || path.includes('/scot') || hay.includes('dev-scot')
  }
  if (family === 'sup') {
    if (id.includes('mec') || path.includes('/mec')) return false
    return (
      id === 'sup' ||
      id.endsWith('--sup') ||
      /--sup--/.test(id) ||
      path.includes('/sup') ||
      hay.includes('dev-sup')
    )
  }
  if (family === 'psmv') return hay.includes('psmv')
  if (family === 'mec') return id.includes('mec') || path.includes('/mec') || hay.includes('mec')
  if (family === 'du') {
    return (
      hay.includes('dev-du') ||
      hay.includes('lowscale') ||
      hay.includes('zone_secteur') ||
      hay.includes('prescription') ||
      hay.includes('dev-info')
    )
  }
  return false
}

function applyRootCatalogBranches(
  catalogChecked: Record<string, boolean>,
  roots: TreeLayerNode[],
  result: Record<FicheDocumentFamily, boolean>,
): void {
  for (const root of roots) {
    const branch = branchForCatalogSubtree(root)
    if (!branch) continue
    if (!catalogChecked[root.id]) continue
    if (branch === 'sup') result.sup = true
    else if (branch === 'scot') result.scot = true
    else if (branch === 'du-overview' || branch === 'du-detail') result.du = true
  }
}

/** Visibilité fiche par famille à partir des cases catalogue (état UI). */
export function computeFicheCatalogFamilyVisibility(
  catalogChecked: Record<string, boolean>,
  entries: CatalogEntryForFicheVisibility[],
  catalogRoots: TreeLayerNode[] = [],
): Record<FicheDocumentFamily, boolean> {
  const result: Record<FicheDocumentFamily, boolean> = {
    du: false,
    psmv: false,
    sup: false,
    scot: false,
    mec: false,
  }

  applyRootCatalogBranches(catalogChecked, catalogRoots, result)

  for (const family of FICHE_DOCUMENT_FAMILIES) {
    const matching = entries.filter((e) => catalogEntryMatchesFamily(e, family))
    if (matching.some((e) => Boolean(catalogChecked[e.id]))) {
      result[family] = true
    }
  }

  for (const family of FICHE_DOCUMENT_FAMILIES) {
    const matching = entries.filter((e) => catalogEntryMatchesFamily(e, family))
    const rootMapped =
      family === 'du' || family === 'sup' || family === 'scot'
        ? catalogRoots.some((root) => {
            const branch = branchForCatalogSubtree(root)
            if (family === 'sup') return branch === 'sup'
            if (family === 'scot') return branch === 'scot'
            return branch === 'du-overview' || branch === 'du-detail'
          })
        : false
    if (!rootMapped && !matching.length) {
      result[family] = familyVisibleFromPermalink(family)
    }
  }

  return result
}

/** Lit la visibilité catalogue depuis le hash permalink (sans refaire de requête API). */
function permalinkLayerEntries(): Array<{ key: string; visible: boolean }> {
  if (typeof window === 'undefined') return []
  const params = getMapPermalinkParams()
  const out: Array<{ key: string; visible: boolean }> = []
  for (const [key, raw] of Object.entries(params)) {
    if (typeof raw !== 'string') continue
    const visible = raw.split(':')[0] === '1'
    out.push({ key: key.toLowerCase(), visible })
  }
  return out
}

function familyVisibleFromPermalink(family: FicheDocumentFamily): boolean {
  const entries = permalinkLayerEntries()
  if (!entries.length) return true

  const matches = entries.filter(({ key }) => {
    if (family === 'scot') return key.includes('dev-scot') || key.includes('scot')
    if (family === 'sup')
      return key.includes('dev-sup') || (key.includes('sup') && !key.includes('psmv'))
    if (family === 'psmv') return key.includes('psmv')
    if (family === 'mec') return key.includes('mec')
    if (family === 'du') {
      return (
        key.includes('dev-du') ||
        key.includes('lowscale') ||
        key.includes('zone_secteur') ||
        key.includes('prescription') ||
        key.includes('dev-info')
      )
    }
    return false
  })

  if (!matches.length) return true
  return matches.some((m) => m.visible)
}

export function isFicheDocumentFamilyVisible(family: FicheDocumentFamily): boolean {
  if (catalogFamilyVisibility) return catalogFamilyVisibility[family]
  return familyVisibleFromPermalink(family)
}

const TAB_FAMILY: Record<string, FicheDocumentFamily> = {
  du: 'du',
  psmv: 'psmv',
  sup: 'sup',
  scot: 'scot',
  procedures: 'mec',
}

export function filterFicheDocumentTabsByCatalog<
  T extends { id: string; bodyHtml: string; label: string },
>(tabs: T[]): T[] {
  return tabs.filter((tab) => {
    const family = TAB_FAMILY[tab.id]
    if (!family) return true
    return isFicheDocumentFamilyVisible(family)
  })
}

/** Masque sections Infos parcelle (zonage, scot, sup, mec…) selon le catalogue. */
export function filterParcelInfosHtmlByCatalog(html: string): string {
  if (!html.includes('ec-fiche-info__rules-section')) return html
  const sectionFamily: Array<{ pattern: RegExp; family: FicheDocumentFamily }> = [
    { pattern: /Schémas de cohérence territoriale/i, family: 'scot' },
    { pattern: /Servitudes d’utilité publique|Servitudes d'utilité publique/i, family: 'sup' },
    { pattern: /Mises en compatibilité/i, family: 'mec' },
    { pattern: /Zonage|Prescriptions|Périmètres|Secteurs|Documents d’urbanisme/i, family: 'du' },
  ]

  return html.replace(
    /<section class="ec-fiche-info__rules-section">[\s\S]*?<\/section>/g,
    (block) => {
      for (const { pattern, family } of sectionFamily) {
        if (pattern.test(block) && !isFicheDocumentFamilyVisible(family)) {
          return ''
        }
      }
      return block
    },
  )
}

const PARCEL_DOCUMENTS_SECTIONS: Array<{
  titlePattern: RegExp
  family: FicheDocumentFamily
}> = [
  { titlePattern: /Documents d[\u2019']urbanisme/i, family: 'du' },
  { titlePattern: /Plans de sauvegarde/i, family: 'psmv' },
  { titlePattern: /Servitudes d[\u2019']utilité publique/i, family: 'sup' },
  { titlePattern: /Schémas de cohérence territoriale/i, family: 'scot' },
]

function familyForDocumentsSectionTitle(title: string): FicheDocumentFamily | null {
  for (const { titlePattern, family } of PARCEL_DOCUMENTS_SECTIONS) {
    if (titlePattern.test(title)) return family
  }
  return null
}

export function filterParcelDocumentsHtmlByCatalog(html: string): string {
  const sectionRe =
    /<h3 class="ec-fiche-info__section-title">([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3 class="ec-fiche-info__section-title">|$)/g
  const introEnd = html.search(/<h3 class="ec-fiche-info__section-title">/)
  const intro = introEnd >= 0 ? html.slice(0, introEnd) : html
  const keptSections: string[] = []

  for (const match of html.matchAll(sectionRe)) {
    const title = match[1]?.trim() ?? ''
    const body = match[2] ?? ''
    const family = familyForDocumentsSectionTitle(title)
    if (family && !isFicheDocumentFamilyVisible(family)) continue
    keptSections.push(`<h3 class="ec-fiche-info__section-title">${title}</h3>${body}`)
  }

  if (!keptSections.length) {
    return intro
  }
  return intro + keptSections.join('')
}

export function applyCatalogVisibilityToFicheSelection(selection: {
  documentTabs?: Array<{ id: string; bodyHtml: string; label: string }>
  parcelInfosHtml?: string
  parcelDocumentsHtml?: string
  bodyHtml?: string
}): void {
  if (selection.documentTabs?.length) {
    selection.documentTabs = filterFicheDocumentTabsByCatalog(selection.documentTabs)
  }
  if (selection.parcelInfosHtml) {
    selection.parcelInfosHtml = filterParcelInfosHtmlByCatalog(selection.parcelInfosHtml)
  }
  if (selection.parcelDocumentsHtml) {
    selection.parcelDocumentsHtml = filterParcelDocumentsHtmlByCatalog(
      selection.parcelDocumentsHtml,
    )
  }
  if (
    selection.bodyHtml &&
    !selection.documentTabs?.length &&
    !isFicheDocumentFamilyVisible('du')
  ) {
    selection.bodyHtml = ''
  }
}

import config from '@/lib/config'
import { coerceDisplayString } from '@/lib/coerceDisplayString'
import { escapeHtml } from '@/lib/fiche/ficheInfoHtml'
import {
  documentIsNonExecutoireEffectiveStatus,
  formatDatapproFromDocumentName,
  resolveLastApprovedProcedureNatureLabel,
} from '@/lib/fiche/ficheDocumentPresentation'
import {
  resolveParcelRuleWrittenPieceHref,
  ruleWrittenPieceLinkHtml,
} from '@/lib/fiche/parcelRuleWrittenPieceLink'
import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import {
  documentSupTileHtml,
  documentTileHrefFromApiFields,
  documentTilesListHtml,
  documentUrbanismTileHtml,
  FICHE_NON_EXECUTOIRE_CALLOUT_HTML,
} from '@/lib/fiche/ficheDocumentTiles'
import { buildParcelDocumentsPresentationHtml } from '@/lib/fiche/ficheDocumentPresentation'
import {
  documentPartitionKeyFromMecPartition,
  mecNoticeHtmlForDocumentName,
  mecProcedureTileHtmlForParcelFeature,
} from '@/lib/fiche/ficheMecPresentation'
import { supCategoryForDocument, supCategoryLibelle } from '@/lib/fiche/ficheSupGroupedPresentation'
import { isFicheDocumentFamilyVisible } from '@/lib/fiche/ficheCatalogVisibilityFilter'
import {
  labelsForParcelFeature,
  formatParcelRuleLabel,
  type ParcelFeatureLabel,
} from '@/lib/fiche/parcelFeatureLabel'
import type { SupCategory } from '@/lib/fiche/parcelLegendImage'
import {
  createParcelFeatureLabel,
  DEFAULT_PARCEL_FICHE_LEGEND_ZOOM,
  getSupLabelFromProperties,
  readSupCategories,
  resolveParcelFeatureLegendImageUrl,
} from '@/lib/fiche/parcelLegendImage'
import { resolveConfigUrlForFetch } from '@/lib/configUrls'

export type ParcelFicheFeature = {
  id?: string
  properties?: Record<string, unknown>
}

export type GpuParcelFichePayload = {
  parcel?: {
    type?: string
    features?: Array<{ properties?: Record<string, unknown> }>
  }
  features?: ParcelFicheFeature[]
  typeref?: string | null
}

export function isGpuParcelFichePayload(data: unknown): data is GpuParcelFichePayload {
  return Boolean(data && typeof data === 'object' && 'features' in data)
}

function layerPrefix(featureId: string): string {
  const dot = featureId.indexOf('.')
  return dot >= 0 ? featureId.slice(0, dot) : featureId
}

type RuleSection =
  'zonage' | 'prescription' | 'information' | 'secteur' | 'sup' | 'scot' | 'mec' | 'document'

const SECTION_TITLES: Record<RuleSection, string> = {
  zonage: 'Zonage(s)',
  prescription: 'Prescriptions',
  information: 'Périmètres d’informations',
  secteur: 'Secteurs',
  sup: 'Servitudes d’utilité publique',
  scot: 'Schémas de cohérence territoriale',
  mec: 'Mises en compatibilité',
  document: 'Documents',
}

function classifyFeature(feature: ParcelFicheFeature): RuleSection | null {
  const id = feature.id ?? ''
  const prefix = layerPrefix(id)
  if (prefix === 'zone_urba') return 'zonage'
  if (prefix.startsWith('prescription')) return 'prescription'
  if (prefix.startsWith('info_')) return 'information'
  if (prefix === 'secteur_cc') return 'secteur'
  if (prefix.startsWith('assiette_sup')) return 'sup'
  if (prefix === 'scot') return 'scot'
  if (prefix === 'mec') return 'mec'
  if (prefix === 'document') return 'document'
  return null
}

function ruleTextsForFeature(
  feature: ParcelFicheFeature,
  featureLabel: ParcelFeatureLabel,
  supCategories: SupCategory[],
): { title: string; subtitle: string } {
  const props = feature.properties ?? {}
  const section = classifyFeature(feature)
  if (section === 'sup') {
    const title = getSupLabelFromProperties(props, supCategories)
    const subtitle = coerceDisplayString(props.nomsuplitt)
    return { title, subtitle }
  }
  if (section === 'scot') {
    return {
      title: formatParcelRuleLabel(coerceDisplayString(props.title) || 'SCoT'),
      subtitle: '',
    }
  }
  if (section === 'mec') {
    return {
      title: formatParcelRuleLabel(
        props.libelle
          ? `Mise en compatibilité - ${coerceDisplayString(props.libelle)}`
          : 'Mise en compatibilité',
      ),
      subtitle: '',
    }
  }
  const labels = labelsForParcelFeature(featureLabel, props)
  if (!labels.length) {
    return { title: 'Règle d’urbanisme', subtitle: '' }
  }
  return { title: labels[0], subtitle: labels.slice(1).join(' — ') }
}

function ruleIconInnerHtml(feature: ParcelFicheFeature, zoom: number): string {
  const imageUrl = resolveParcelFeatureLegendImageUrl(feature, zoom)
  if (imageUrl) {
    return `<img class="ec-fiche-info__rule-icon-img" src="${escapeHtml(imageUrl)}" alt="" width="40" height="40" loading="lazy" decoding="async" />`
  }
  const props = feature.properties ?? {}
  const fallback =
    coerceDisplayString(props.libelle ?? props.typezone ?? props.typepsc ?? props.suptype)
      .slice(0, 4)
      .toUpperCase() || '—'
  return escapeHtml(fallback)
}

function ruleRowHtml(
  feature: ParcelFicheFeature,
  zoom: number,
  featureLabel: ParcelFeatureLabel,
  supCategories: SupCategory[],
): string {
  const props = feature.properties ?? {}
  const { title, subtitle } = ruleTextsForFeature(feature, featureLabel, supCategories)
  const docLink = ruleWrittenPieceLinkHtml(resolveParcelRuleWrittenPieceHref(props))
  const subBlock = subtitle ? `<p class="ec-fiche-info__rule-sub">${escapeHtml(subtitle)}</p>` : ''
  const iconInner = ruleIconInnerHtml(feature, zoom)
  return `<article class="ec-fiche-info__rule-row"><div class="ec-fiche-info__rule-icon" aria-hidden="true">${iconInner}</div><div class="ec-fiche-info__rule-body"><p class="ec-fiche-info__rule-title">${escapeHtml(title)}</p>${subBlock}</div>${docLink}</article>`
}

type GpuFichePartition = {
  documents?: Array<Record<string, unknown>>
}

type GpuSiteDocumentRecord = {
  id?: string
  name?: string
  originalName?: string
  effectiveStatus?: string
  legalStatus?: string
  status?: string
  title?: string
  viewUrl?: string
  archiveUrl?: string
  type?: string
  typeproc_title?: string
}

type GpuSiteDocumentLookup = {
  byId: Map<string, GpuSiteDocumentRecord>
  byName: Map<string, GpuSiteDocumentRecord>
  byPartition: Map<string, GpuSiteDocumentRecord>
}

function normalizePartitionsMap(
  value: Record<string, GpuFichePartition> | GpuFichePartition[] | null | undefined,
): Record<string, GpuFichePartition> {
  if (!value || Array.isArray(value)) return {}
  return value
}

function gpuSiteDocumentRecordFromApiDoc(doc: Record<string, unknown>): GpuSiteDocumentRecord {
  const id = coerceDisplayString(doc.id)
  return {
    id: id && /^[a-f0-9]{32}$/i.test(id) ? id : undefined,
    name: coerceDisplayString(doc.name) || undefined,
    originalName: coerceDisplayString(doc.originalName) || undefined,
    effectiveStatus: coerceDisplayString(doc.effectiveStatus) || undefined,
    legalStatus: coerceDisplayString(doc.legalStatus) || undefined,
    status: coerceDisplayString(doc.status) || undefined,
    title: coerceDisplayString(doc.title) || undefined,
    viewUrl: coerceDisplayString(doc.viewUrl) || undefined,
    archiveUrl: coerceDisplayString(doc.archiveUrl) || undefined,
    type: coerceDisplayString(doc.type) || undefined,
    typeproc_title: coerceDisplayString(doc.typeproc_title) || undefined,
  }
}

function registerGpuSiteDocumentRecord(
  record: GpuSiteDocumentRecord,
  byId: Map<string, GpuSiteDocumentRecord>,
  byName: Map<string, GpuSiteDocumentRecord>,
): void {
  if (record.id) byId.set(record.id.toLowerCase(), record)
  if (record.originalName) byName.set(record.originalName.toUpperCase(), record)
}

function gpuSiteDocumentLookupFromFicheApi(
  ficheApi: GpuFicheInfoPayload | null | undefined,
): GpuSiteDocumentLookup | null {
  if (!ficheApi) return null
  const byId = new Map<string, GpuSiteDocumentRecord>()
  const byName = new Map<string, GpuSiteDocumentRecord>()
  const byPartition = new Map<string, GpuSiteDocumentRecord>()
  for (const panel of [ficheApi.dus, ficheApi.psmvs, ficheApi.scots, ficheApi.sups]) {
    for (const [partitionKey, partition] of Object.entries(normalizePartitionsMap(panel))) {
      const partitionNorm = partitionKey.trim().toLowerCase()
      for (const doc of partition.documents ?? []) {
        const record = gpuSiteDocumentRecordFromApiDoc(doc)
        registerGpuSiteDocumentRecord(record, byId, byName)
        const docName = coerceDisplayString(doc.name)
        if (docName) byName.set(docName.toUpperCase(), record)
        if (partitionNorm && record.id) byPartition.set(partitionNorm, record)
      }
    }
  }
  return { byId, byName, byPartition }
}

function parcelFeatureGpuDocumentId(props: Record<string, unknown>): string | undefined {
  return (
    coerceDisplayString(props.documentId) ||
    coerceDisplayString(props.gpu_id) ||
    coerceDisplayString(props.gpuId) ||
    coerceDisplayString(props.id) ||
    undefined
  )
}

function gpuSiteDocumentForFeatureProps(
  props: Record<string, unknown>,
  lookup: GpuSiteDocumentLookup | null,
  options?: { matchPartition?: boolean },
): GpuSiteDocumentRecord | null {
  if (!lookup) return null
  const docId = parcelFeatureGpuDocumentId(props)
  if (docId) {
    const byId = lookup.byId.get(docId.toLowerCase())
    if (byId) return byId
  }
  const name = coerceDisplayString(props.originalName ?? props.name).toUpperCase()
  if (name) {
    const byName = lookup.byName.get(name)
    if (byName) return byName
  }
  if (options?.matchPartition) {
    const partition = coerceDisplayString(props.partition).toLowerCase()
    if (partition) {
      const byPartition = lookup.byPartition.get(partition)
      if (byPartition) return byPartition
    }
  }
  return null
}

function documentFeatureInGpuSite(
  props: Record<string, unknown>,
  lookup: GpuSiteDocumentLookup | null,
): boolean {
  if (props.inDatabase === true || props.in_database === true) return true
  if (props.inDatabase === false || props.in_database === false) return false
  if (gpuSiteDocumentForFeatureProps(props, lookup)) return true

  const docId = parcelFeatureGpuDocumentId(props)
  return Boolean(docId && lookup?.byId.has(docId.toLowerCase()))
}

function wfsFeatureMatchesGpuSiteRecord(
  props: Record<string, unknown>,
  record: GpuSiteDocumentRecord,
): boolean {
  const id = parcelFeatureGpuDocumentId(props)
  if (record.id && id && record.id.toLowerCase() === id.toLowerCase()) return true
  const name = coerceDisplayString(props.name ?? props.originalName).toUpperCase()
  if (record.originalName && name === record.originalName.toUpperCase()) return true
  if (record.name && name === record.name.toUpperCase()) return true
  return false
}

function urbanismTileFromGpuSiteRecord(
  record: GpuSiteDocumentRecord,
  ficheApi: GpuFicheInfoPayload | null | undefined,
  partitionKey: string,
): string {
  const documentName = record.originalName ?? record.name ?? ''
  const partitionName = record.name ?? partitionKey
  const datapproLabel = documentName ? formatDatapproFromDocumentName(documentName) : null
  return documentUrbanismTileHtml({
    title: record.title ?? record.type ?? 'Document d’urbanisme',
    href: documentTileHrefFromApiFields({
      id: record.id,
      archiveUrl: record.archiveUrl,
      viewUrl: record.viewUrl,
    }),
    effectiveStatus: record.effectiveStatus,
    legalStatus: record.legalStatus,
    status: record.status,
    datapproLabel,
    procedureNatureLabel: resolveLastApprovedProcedureNatureLabel(
      record,
      ficheApi?.proceduresByDocument,
    ),
    defaultApprovedWhenStatusMissing: true,
    notInDatabase: false,
    mecNoticeHtml: ficheApi
      ? mecNoticeHtmlForDocumentName(ficheApi, documentName, partitionName)
      : undefined,
  })
}

function documentCardFromFeature(
  feature: ParcelFicheFeature,
  lookup: GpuSiteDocumentLookup | null,
  ficheApi?: GpuFicheInfoPayload | null,
): string {
  const props = feature.properties ?? {}
  const gpuSite = gpuSiteDocumentForFeatureProps(props, lookup)
  const title =
    coerceDisplayString(props.title) ||
    gpuSite?.title ||
    coerceDisplayString(props.originalName) ||
    coerceDisplayString(props.name) ||
    'Document d’urbanisme'
  const status = coerceDisplayString(props.status) || gpuSite?.status || undefined
  const effective =
    coerceDisplayString(props.effectiveStatus) || gpuSite?.effectiveStatus || undefined
  const legalStatus = coerceDisplayString(props.legalStatus) || gpuSite?.legalStatus || undefined
  const name = coerceDisplayString(props.originalName ?? props.name)
  const datapproLabel = name ? formatDatapproFromDocumentName(name) : null
  const docId = gpuSite?.id || parcelFeatureGpuDocumentId(props)
  const partitionName =
    coerceDisplayString(props.name) || coerceDisplayString(props.partition) || undefined
  const href =
    documentTileHrefFromApiFields({
      id: docId,
      archiveUrl:
        coerceDisplayString(props.archiveUrl ?? props.urlfic) || gpuSite?.archiveUrl || undefined,
      viewUrl: coerceDisplayString(props.viewUrl) || gpuSite?.viewUrl || undefined,
    }) ?? undefined
  const notInDatabase = !documentFeatureInGpuSite(props, lookup)
  return documentUrbanismTileHtml({
    title,
    href,
    effectiveStatus: effective,
    legalStatus,
    status,
    datapproLabel,
    procedureNatureLabel: gpuSite
      ? resolveLastApprovedProcedureNatureLabel(gpuSite, ficheApi?.proceduresByDocument)
      : null,
    defaultApprovedWhenStatusMissing: true,
    notInDatabase,
    mecNoticeHtml:
      ficheApi && !notInDatabase
        ? mecNoticeHtmlForDocumentName(ficheApi, name, partitionName)
        : undefined,
  })
}

function featureDedupeKey(feature: ParcelFicheFeature): string {
  const props = feature.properties ?? {}
  return [
    feature.id ?? '',
    coerceDisplayString(props.partition),
    coerceDisplayString(props.libelle),
    coerceDisplayString(props.typezone),
    coerceDisplayString(props.typepsc),
  ].join('|')
}

function dedupeFeatures(features: ParcelFicheFeature[]): ParcelFicheFeature[] {
  const seen = new Set<string>()
  const out: ParcelFicheFeature[] = []
  for (const feature of features) {
    const key = featureDedupeKey(feature)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(feature)
  }
  return out
}

function dedupeMecFeaturesByPartition(features: ParcelFicheFeature[]): ParcelFicheFeature[] {
  const seen = new Set<string>()
  const out: ParcelFicheFeature[] = []
  for (const feature of features) {
    const partition = coerceDisplayString(feature.properties?.partition).toLowerCase()
    const key = partition || featureDedupeKey(feature)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(feature)
  }
  return out
}

function blockedParentPartitionsFromMecFeatures(mecFeatures: ParcelFicheFeature[]): Set<string> {
  const blocked = new Set<string>()
  for (const feature of dedupeMecFeaturesByPartition(mecFeatures)) {
    const mecPartition = coerceDisplayString(feature.properties?.partition)
    if (!mecPartition) continue
    blocked.add(documentPartitionKeyFromMecPartition(mecPartition).toLowerCase())
  }
  return blocked
}

function mecTileFromFeature(
  feature: ParcelFicheFeature,
  ficheApi: GpuFicheInfoPayload | null | undefined,
): string {
  const props = feature.properties ?? {}
  const libelle = coerceDisplayString(props.libelle)
  const mecPartition = coerceDisplayString(props.partition)
  const fallbackTitle = libelle ? `Mise en compatibilité - ${libelle}` : undefined
  return mecProcedureTileHtmlForParcelFeature(ficheApi, {
    mecPartitionKey: mecPartition,
    fallbackTitle,
    fallbackDocumentId: parcelFeatureGpuDocumentId(props),
  })
}

function buildDuDocumentTiles(
  documentFeatures: ParcelFicheFeature[],
  blockedParents: Set<string>,
  lookup: GpuSiteDocumentLookup | null,
  ficheApi: GpuFicheInfoPayload | null | undefined,
): string[] {
  const tiles: string[] = []
  const byPartition = new Map<string, ParcelFicheFeature[]>()

  for (const feature of documentFeatures) {
    const partition = coerceDisplayString(feature.properties?.partition).toLowerCase()
    if (partition && blockedParents.has(partition)) continue
    const key = partition || '_none'
    const list = byPartition.get(key) ?? []
    list.push(feature)
    byPartition.set(key, list)
  }

  for (const [partition, group] of byPartition) {
    const apiRecord = partition !== '_none' ? (lookup?.byPartition.get(partition) ?? null) : null
    if (apiRecord?.id) {
      tiles.push(urbanismTileFromGpuSiteRecord(apiRecord, ficheApi, partition))
    }
    const seenWfs = new Set<string>()
    for (const feature of group) {
      const props = feature.properties ?? {}
      if (apiRecord && wfsFeatureMatchesGpuSiteRecord(props, apiRecord)) continue
      const nameKey =
        coerceDisplayString(props.name ?? props.originalName).toUpperCase() ||
        featureDedupeKey(feature)
      if (seenWfs.has(nameKey)) continue
      seenWfs.add(nameKey)
      tiles.push(documentCardFromFeature(feature, lookup, ficheApi))
    }
  }

  return tiles
}

function buildMecReplacementTiles(
  mecFeatures: ParcelFicheFeature[],
  blockedParents: Set<string>,
  ficheApi: GpuFicheInfoPayload | null | undefined,
): string[] {
  const tiles: string[] = []
  for (const feature of dedupeMecFeaturesByPartition(mecFeatures)) {
    const mecPartition = coerceDisplayString(feature.properties?.partition)
    if (!mecPartition) continue
    const parent = documentPartitionKeyFromMecPartition(mecPartition).toLowerCase()
    if (!blockedParents.has(parent)) continue
    if (parent.startsWith('scot_')) continue
    tiles.push(mecTileFromFeature(feature, ficheApi))
  }
  return tiles
}

function buildSupDocumentTiles(
  ficheApi: GpuFicheInfoPayload | null | undefined,
  hasSupOnParcel: boolean,
): string[] {
  if (!hasSupOnParcel || !ficheApi) return []
  const categories = readSupCategories()
  const seen = new Set<string>()
  const tiles: string[] = []
  for (const partition of Object.values(normalizePartitionsMap(ficheApi.sups))) {
    const docs = partition.documents ?? []
    const production = docs.filter((d) => d.status === 'document.production')
    const doc = (production[0] ?? docs[0]) as Record<string, unknown> | undefined
    if (!doc) continue
    const id = coerceDisplayString(doc.id)
    if (id && seen.has(id.toLowerCase())) continue
    if (id) seen.add(id.toLowerCase())
    const title = coerceDisplayString(doc.title) || 'Servitude d’utilité publique'
    const category = supCategoryForDocument(
      {
        name: coerceDisplayString(doc.name),
        originalName: coerceDisplayString(doc.originalName),
        typepsc: coerceDisplayString(doc.typepsc),
      },
      categories,
    )
    tiles.push(
      documentSupTileHtml({
        title: supCategoryLibelle(category),
        detail: title,
        href: documentTileHrefFromApiFields({
          id: coerceDisplayString(doc.id) || undefined,
          viewUrl: coerceDisplayString(doc.viewUrl) || undefined,
          archiveUrl: coerceDisplayString(doc.archiveUrl) || undefined,
        }),
      }),
    )
  }
  return tiles
}

/** Une tuile SCoT par partition (le WFS peut dupliquer la même emprise). */
function dedupeScotFeaturesByPartition(features: ParcelFicheFeature[]): ParcelFicheFeature[] {
  const seen = new Set<string>()
  const out: ParcelFicheFeature[] = []
  for (const feature of features) {
    const partition = coerceDisplayString(feature.properties?.partition).toLowerCase()
    const key = partition || featureDedupeKey(feature)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(feature)
  }
  return out
}

function dedupeRuleFeatures(
  features: ParcelFicheFeature[],
  zoom: number,
  featureLabel: ParcelFeatureLabel,
  supCategories: SupCategory[],
): ParcelFicheFeature[] {
  const seen = new Set<string>()
  const out: ParcelFicheFeature[] = []
  for (const feature of features) {
    const { title, subtitle } = ruleTextsForFeature(feature, featureLabel, supCategories)
    const key = `${title}|${subtitle}|${ruleIconInnerHtml(feature, zoom)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(feature)
  }
  return out
}

function groupFeatures(
  features: ParcelFicheFeature[],
  zoom: number,
  featureLabel: ParcelFeatureLabel,
  supCategories: SupCategory[],
): Map<RuleSection, ParcelFicheFeature[]> {
  const map = new Map<RuleSection, ParcelFicheFeature[]>()
  for (const feature of dedupeRuleFeatures(
    dedupeFeatures(features),
    zoom,
    featureLabel,
    supCategories,
  )) {
    const section = classifyFeature(feature)
    if (!section || section === 'document') continue
    const list = map.get(section) ?? []
    list.push(feature)
    map.set(section, list)
  }
  return map
}

function scotTileFromFeature(
  feature: ParcelFicheFeature,
  lookup: GpuSiteDocumentLookup | null,
  ficheApi: GpuFicheInfoPayload | null | undefined,
): string {
  const props = feature.properties ?? {}
  const gpuSite = gpuSiteDocumentForFeatureProps(props, lookup, { matchPartition: true })
  const title = gpuSite?.title || formatParcelRuleLabel(coerceDisplayString(props.title) || 'SCoT')
  const name = gpuSite?.originalName || coerceDisplayString(props.originalName ?? props.name)
  const partitionName =
    coerceDisplayString(props.name) || coerceDisplayString(props.partition) || undefined
  const datapproLabel = name ? formatDatapproFromDocumentName(name) : null
  const docId = gpuSite?.id || parcelFeatureGpuDocumentId(props)
  const status = coerceDisplayString(props.status) || gpuSite?.status || undefined
  const effective =
    coerceDisplayString(props.effectiveStatus) || gpuSite?.effectiveStatus || undefined
  const legalStatus = coerceDisplayString(props.legalStatus) || gpuSite?.legalStatus || undefined
  return documentUrbanismTileHtml({
    title,
    href: documentTileHrefFromApiFields({
      id: docId,
      archiveUrl:
        coerceDisplayString(props.archiveUrl ?? props.urlfic) || gpuSite?.archiveUrl || undefined,
      viewUrl: coerceDisplayString(props.viewUrl) || gpuSite?.viewUrl || undefined,
    }),
    effectiveStatus: effective,
    legalStatus,
    status,
    datapproLabel,
    procedureNatureLabel: gpuSite
      ? resolveLastApprovedProcedureNatureLabel(gpuSite, ficheApi?.proceduresByDocument)
      : null,
    defaultApprovedWhenStatusMissing: true,
    notInDatabase: !documentFeatureInGpuSite(props, lookup),
    mecNoticeHtml: ficheApi
      ? mecNoticeHtmlForDocumentName(ficheApi, name, partitionName)
      : undefined,
  })
}

export function buildParcelInfosHtmlFromFiche(
  data: GpuParcelFichePayload,
  zoom = DEFAULT_PARCEL_FICHE_LEGEND_ZOOM,
): string {
  const features = data.features ?? []
  const featureLabel = createParcelFeatureLabel()
  const supCategories = readSupCategories()
  const grouped = groupFeatures(features, zoom, featureLabel, supCategories)
  const sectionFamily: Partial<Record<RuleSection, 'du' | 'mec' | 'sup' | 'scot'>> = {
    zonage: 'du',
    prescription: 'du',
    information: 'du',
    secteur: 'du',
    mec: 'mec',
    sup: 'sup',
    scot: 'scot',
  }
  const order: RuleSection[] = [
    'zonage',
    'prescription',
    'information',
    'secteur',
    'mec',
    'sup',
    'scot',
  ]
  const parts: string[] = []
  for (const section of order) {
    const family = sectionFamily[section]
    if (family && !isFicheDocumentFamilyVisible(family)) continue
    const list = grouped.get(section)
    if (!list?.length) continue
    const rows = list.map((f) => ruleRowHtml(f, zoom, featureLabel, supCategories)).join('')
    parts.push(
      `<section class="ec-fiche-info__rules-section"><h4 class="ec-fiche-info__rules-section-title">${escapeHtml(SECTION_TITLES[section])}</h4>${rows}</section>`,
    )
  }
  if (!parts.length) {
    return '<p>Aucune règle d’urbanisme intersectant cette parcelle.</p>'
  }
  return parts.join('')
}

function documentFeatureIsNonExecutoire(
  feature: ParcelFicheFeature,
  lookup: GpuSiteDocumentLookup | null,
): boolean {
  const props = feature.properties ?? {}
  const gpuSite = gpuSiteDocumentForFeatureProps(props, lookup)
  const effective =
    coerceDisplayString(props.effectiveStatus) || gpuSite?.effectiveStatus || undefined
  return documentIsNonExecutoireEffectiveStatus(effective)
}

function buildScotDocumentTiles(
  scotFeatures: ParcelFicheFeature[],
  mecFeatures: ParcelFicheFeature[],
  blockedParents: Set<string>,
  lookup: GpuSiteDocumentLookup | null,
  ficheApi: GpuFicheInfoPayload | null | undefined,
  mecCatalogVisible: boolean,
): string[] {
  const tiles: string[] = []
  for (const feature of dedupeScotFeaturesByPartition(scotFeatures)) {
    const partition = coerceDisplayString(feature.properties?.partition).toLowerCase()
    if (mecCatalogVisible && partition && blockedParents.has(partition)) {
      for (const mec of dedupeMecFeaturesByPartition(mecFeatures)) {
        const mecParent = documentPartitionKeyFromMecPartition(
          coerceDisplayString(mec.properties?.partition),
        ).toLowerCase()
        if (mecParent !== partition) continue
        tiles.push(mecTileFromFeature(mec, ficheApi))
        break
      }
      continue
    }
    tiles.push(scotTileFromFeature(feature, lookup, ficheApi))
  }
  return tiles
}

export function buildParcelDocumentsHtmlFromFiche(
  data: GpuParcelFichePayload,
  ficheApi?: GpuFicheInfoPayload | null,
): string {
  const all = data.features ?? []
  const lookup = gpuSiteDocumentLookupFromFicheApi(ficheApi)
  const documentFeatures = all.filter((f) => classifyFeature(f) === 'document')
  const scotFeatures = all.filter((f) => classifyFeature(f) === 'scot')
  const mecFeatures = all.filter((f) => classifyFeature(f) === 'mec')
  const hasSupOnParcel = all.some((f) => classifyFeature(f) === 'sup')
  const mecCatalogVisible = isFicheDocumentFamilyVisible('mec')
  const blockedParents = mecCatalogVisible
    ? blockedParentPartitionsFromMecFeatures(mecFeatures)
    : new Set<string>()

  const parts: string[] = []
  if (
    documentFeatures.some((f) => documentFeatureIsNonExecutoire(f, lookup)) ||
    (ficheApi && buildParcelDocumentsPresentationHtml(ficheApi).includes('ec-fiche-info__callout'))
  ) {
    parts.push(FICHE_NON_EXECUTOIRE_CALLOUT_HTML)
  }
  parts.push(
    '<p class="ec-fiche-info__intro">La parcelle est couverte par les documents suivants :</p>',
  )

  const duTiles = isFicheDocumentFamilyVisible('du')
    ? [
        ...(mecCatalogVisible
          ? buildMecReplacementTiles(mecFeatures, blockedParents, ficheApi)
          : []),
        ...buildDuDocumentTiles(documentFeatures, blockedParents, lookup, ficheApi),
      ]
    : []
  const supTiles = isFicheDocumentFamilyVisible('sup')
    ? buildSupDocumentTiles(ficheApi, hasSupOnParcel)
    : []
  const scotTiles = isFicheDocumentFamilyVisible('scot')
    ? buildScotDocumentTiles(
        scotFeatures,
        mecFeatures,
        blockedParents,
        lookup,
        ficheApi,
        mecCatalogVisible,
      )
    : []

  if (!duTiles.length && !supTiles.length && !scotTiles.length && ficheApi) {
    const presentation = buildParcelDocumentsPresentationHtml(ficheApi)
    const sections = presentation
      .replace(/^[\s\S]*?<p class="ec-fiche-info__intro">[\s\S]*?<\/p>/, '')
      .trim()
    if (sections) parts.push(sections)
    return parts.join('')
  }

  if (!duTiles.length && !supTiles.length && !scotTiles.length) {
    return parts.join('')
  }

  if (duTiles.length) {
    parts.push('<h3 class="ec-fiche-info__section-title">Documents d’urbanisme</h3>')
    parts.push(documentTilesListHtml(duTiles))
  }
  if (supTiles.length) {
    parts.push('<h3 class="ec-fiche-info__section-title">Servitudes d’utilité publique</h3>')
    parts.push(documentTilesListHtml(supTiles))
  }
  if (scotTiles.length) {
    parts.push('<h3 class="ec-fiche-info__section-title">Schémas de cohérence territoriale</h3>')
    parts.push(documentTilesListHtml(scotTiles))
  }
  return parts.join('')
}

export function resolveApiParcelFicheUrl(): string | null {
  const raw = config.apiParcelFicheUrl
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length ? trimmed : null
}

export function buildParcelFicheFetchUrl(parcelId: string): string | null {
  const template = resolveApiParcelFicheUrl()
  if (!template) return null
  const placeholders = config.urlPlaceholders as { parcelId?: string } | undefined
  const ph = placeholders?.parcelId ?? '{parcelId}'
  const replaced = template.replaceAll(ph, encodeURIComponent(parcelId))
  return resolveConfigUrlForFetch(replaced)
}

export async function fetchGpuParcelFiche(parcelId: string): Promise<GpuParcelFichePayload> {
  const url = buildParcelFicheFetchUrl(parcelId)
  if (!url) throw new Error('Service fiche parcelle non configuré (apiParcelFicheUrl).')
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) {
    throw new Error(`Parcel fiche HTTP ${res.status}`)
  }
  const data: unknown = await res.json()
  if (!isGpuParcelFichePayload(data)) {
    throw new Error('Invalid parcel fiche payload')
  }
  return data
}

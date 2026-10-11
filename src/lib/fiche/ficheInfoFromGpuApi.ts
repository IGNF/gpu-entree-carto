import type { FicheInfoDocumentTab, FicheInfoSelection } from '@/composables/tabPanels'
import { cadastreReferencesFromParcel, parcelShortLabel } from '@/lib/fiche/ficheCadastreReferences'
import {
  ficheHasParcelAtPoint,
  ficheHasTerritoryAtPoint,
  NO_PARCEL_AT_POINT_MESSAGE,
} from '@/lib/fiche/ficheAvailability'
import {
  buildDocumentTypeTabTilesHtml,
  buildParcelDocumentsPresentationHtml,
  formatDatapproFromDocumentName,
  prependNonExecutoireCalloutForPartitionMap,
  resolveLastApprovedProcedureNatureLabel,
} from '@/lib/fiche/ficheDocumentPresentation'
import { mecNoticeHtmlForDocumentName } from '@/lib/fiche/ficheMecPresentation'
import { buildGroupedSupTabHtml } from '@/lib/fiche/ficheSupGroupedPresentation'
import { buildMecTerritoryProceduresHtml } from '@/lib/fiche/ficheMecPresentation'
import {
  applyCatalogVisibilityToFicheSelection,
  isFicheDocumentFamilyVisible,
} from '@/lib/fiche/ficheCatalogVisibilityFilter'
import {
  documentTileHrefFromApiFields,
  documentTilesListHtml,
  documentUrbanismTileHtml,
  procedureTileHtml,
  procedureTileHref,
} from '@/lib/fiche/ficheDocumentTiles'
import {
  buildParcelDocumentsHtmlFromFiche,
  buildParcelInfosHtmlFromFiche,
  isGpuParcelFichePayload,
  type GpuParcelFichePayload,
} from '@/lib/fiche/parcelFicheFromGpuApi'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import { escapeHtml } from '@/lib/fiche/ficheInfoHtml'

type GpuFicheFeature = Record<string, unknown>

type GpuFicheDocument = {
  id?: string
  title?: string
  name?: string
  originalName?: string
  type?: string
  status?: string
  typeref?: string | null
  archiveUrl?: string
  viewUrl?: string
  legalStatus?: string
  typeproc_title?: string
  effectiveStatus?: string
}

type GpuFichePartition = {
  features?: GpuFicheFeature[]
  documents?: GpuFicheDocument[]
  pets?: unknown[]
}

type GpuFicheProcedure = {
  id?: string
  name?: string
  documentName?: string
  documentType?: string
  documentNotEnforceable?: boolean
  inProgress?: boolean
  approbationDate?: string
  procedureType?: { title?: string; name?: string }
  files?: Array<{ title?: string; name?: string; url?: string }>
  grid?: { title?: string; name?: string }
}

export type GpuFicheDeletedGrid = {
  id?: string
  properties?: { insee?: string; name?: string; is_rnu?: boolean }
}

export type GpuFicheInfoPayload = {
  parcel?: Record<string, unknown> | null
  parcelId?: string
  parcelFiche?: GpuParcelFichePayload
  features?: GpuParcelFichePayload['features']
  parcelGeometry?: unknown
  gridGeometry?: unknown
  /** Contour commune « ville » (Paris / Lyon / Marseille) lorsque le point est dans un arrondissement. */
  parentGridGeometry?: unknown
  territoryParcelId?: string
  grid?: { name?: string; insee?: string; is_rnu?: boolean; viewUrl?: string } | null
  deletedGrids?: GpuFicheDeletedGrid[]
  /** Référentiel cadastral (CNIG), renvoyé par `/api/fiche-info` — pilote la couche cadastre basse. */
  typeref?: string | null
  dus?: Record<string, GpuFichePartition> | GpuFichePartition[]
  psmvs?: Record<string, GpuFichePartition> | GpuFichePartition[]
  sups?: Record<string, GpuFichePartition> | GpuFichePartition[]
  scots?: Record<string, GpuFichePartition> | GpuFichePartition[]
  lowScaleDocument?: Record<string, GpuFicheDocument> | GpuFicheDocument[] | null
  proceduresByDocument?: Record<string, GpuFicheProcedure[]>
  notUnforceableByDocument?: Record<string, boolean>
  mecsDu?: Record<string, GpuFichePartition> | GpuFichePartition[]
  mecsScot?: Record<string, GpuFichePartition> | GpuFichePartition[]
  is_el9_alert?: boolean
}

const TAB_DU = 'du'
const TAB_PSMV = 'psmv'
const TAB_SUP = 'sup'
const TAB_SCOT = 'scot'
const TAB_PROCEDURES = 'procedures'

export function isGpuFicheInfoPayload(data: unknown): data is GpuFicheInfoPayload {
  if (!data || typeof data !== 'object') return false
  const o = data as Record<string, unknown>
  return 'parcel' in o || 'grid' in o || 'dus' in o || 'partitions' in o || 'parcelFeature' in o
}

function normalizePartitionsMap(
  value: Record<string, GpuFichePartition> | GpuFichePartition[] | null | undefined,
): Record<string, GpuFichePartition> {
  if (!value) return {}
  if (Array.isArray(value)) return {}
  return value
}

const MUNICIPALITY_LOWER_PARTS = new Set([
  'de',
  'la',
  'le',
  'les',
  'du',
  'des',
  'en',
  'sur',
  'sous',
  'aux',
])

function formatMunicipalityName(raw: string): string {
  return raw
    .split('-')
    .map((part, index) => {
      if (!part) return part
      const lower = part.toLowerCase()
      if (index > 0 && MUNICIPALITY_LOWER_PARTS.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join('-')
}

function pickProductionDocument(
  documents: GpuFicheDocument[] | undefined,
): GpuFicheDocument | null {
  if (!documents?.length) return null
  const production = documents.filter((d) => d.status === 'document.production')
  return production[0] ?? documents[0] ?? null
}

function partitionHasProductionDocument(partition: GpuFichePartition): boolean {
  return pickProductionDocument(partition.documents) != null
}

function mapHasProductionDocument(map: Record<string, GpuFichePartition>): boolean {
  return Object.values(map).some(partitionHasProductionDocument)
}

function buildDocumentTypeTabHtml(
  partitions: Record<string, GpuFichePartition>,
  kind: 'du' | 'psmv' | 'scot' | 'sup',
  proceduresByDocument?: GpuFicheInfoPayload['proceduresByDocument'],
): string {
  return buildDocumentTypeTabTilesHtml(partitions, kind, proceduresByDocument)
}

function collectInProgressProcedures(
  proceduresByDocument: Record<string, GpuFicheProcedure[]> | undefined,
): GpuFicheProcedure[] {
  if (!proceduresByDocument) return []
  const out: GpuFicheProcedure[] = []
  for (const list of Object.values(proceduresByDocument)) {
    for (const procedure of list) {
      if (procedure.inProgress === true) out.push(procedure)
    }
  }
  return out
}

function formatProcedureDisplayDate(raw: string | undefined): string | null {
  if (!raw?.trim()) return null
  const value = raw.trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value
  const iso = Date.parse(value)
  if (Number.isFinite(iso)) {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${d.getFullYear()}`
  }
  return value
}

function oldestProcedureFileDate(procedure: GpuFicheProcedure): string | null {
  const files = procedure.files ?? []
  let oldest: number | null = null
  for (const file of files) {
    const candidate =
      (file as { uploadedAt?: string; uploadDate?: string }).uploadedAt ??
      (file as { uploadDate?: string }).uploadDate
    if (!candidate) continue
    const ts = Date.parse(candidate)
    if (!Number.isFinite(ts)) continue
    if (oldest == null || ts < oldest) oldest = ts
  }
  if (oldest == null) return null
  return formatProcedureDisplayDate(new Date(oldest).toISOString())
}

function buildProceduresTabHtml(procedures: GpuFicheProcedure[]): string {
  if (!procedures.length) return ''
  const tiles = procedures.map((procedure) => {
    const title =
      procedure.name?.trim() ||
      procedure.procedureType?.title?.trim() ||
      procedure.documentName?.trim() ||
      'Procédure'
    const inProgress = procedure.inProgress === true
    const detail = inProgress
      ? (() => {
          const initiated = oldestProcedureFileDate(procedure)
          return initiated ? `Initié le ${initiated}` : null
        })()
      : (() => {
          const approved = formatProcedureDisplayDate(procedure.approbationDate)
          return approved ? `Approuvée le ${approved}` : null
        })()
    return procedureTileHtml({
      title,
      href: procedureTileHref(procedure.id, procedure.files?.[0]?.url),
      inProgress,
      detailLine: detail,
    })
  })
  return documentTilesListHtml(tiles)
}

function collectMecProcedures(
  proceduresByDocument: Record<string, GpuFicheProcedure[]> | undefined,
): GpuFicheProcedure[] {
  if (!proceduresByDocument) return []
  const out: GpuFicheProcedure[] = []
  for (const [docName, list] of Object.entries(proceduresByDocument)) {
    if (!/^MEC_/i.test(docName)) continue
    for (const procedure of list) {
      out.push(procedure)
    }
  }
  return out
}

function buildDuTabTilesHtml(
  partitions: Record<string, GpuFichePartition>,
  data: GpuFicheInfoPayload,
): string {
  const keys = Object.keys(partitions)
  if (!keys.length) return ''
  const tiles: string[] = []
  for (const partition of Object.values(partitions)) {
    const doc = pickProductionDocument(partition.documents)
    if (!doc) continue
    const title = doc.title?.trim() || doc.type || 'Document'
    const name = doc.originalName ?? doc.name ?? ''
    const partitionName = typeof doc.name === 'string' ? doc.name : undefined
    const datappro = name ? formatDatapproFromDocumentName(name) : null
    tiles.push(
      documentUrbanismTileHtml({
        title,
        href: documentTileHrefFromApiFields(doc),
        effectiveStatus: doc.effectiveStatus,
        legalStatus: doc.legalStatus,
        status: doc.status,
        datapproLabel: datappro,
        procedureNatureLabel: resolveLastApprovedProcedureNatureLabel(
          doc,
          data.proceduresByDocument,
        ),
        mecNoticeHtml: mecNoticeHtmlForDocumentName(data, name, partitionName),
      }),
    )
  }
  if (!tiles.length) return ''
  const list = documentTilesListHtml(tiles)
  if (keys.length > 1) {
    return `<p class="ec-fiche-info__intro">Zone d’incertitude où se superposent plusieurs documents.</p>${list}`
  }
  return list
}

function normalizeLowScaleDocuments(
  value: GpuFicheInfoPayload['lowScaleDocument'],
): GpuFicheDocument[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'object') return Object.values(value)
  return []
}

function buildLowScaleDocumentsHtml(
  documents: GpuFicheDocument[],
  proceduresByDocument?: GpuFicheInfoPayload['proceduresByDocument'],
): string {
  if (!documents.length) return ''
  const tiles = documents.map((doc) => {
    const title = doc.title?.trim() || doc.type || 'Document'
    const name = doc.originalName ?? doc.name ?? ''
    const datappro = name ? formatDatapproFromDocumentName(name) : null
    return documentUrbanismTileHtml({
      title,
      href: documentTileHrefFromApiFields(doc),
      effectiveStatus: doc.effectiveStatus,
      legalStatus: doc.legalStatus,
      status: doc.status,
      datapproLabel: datappro,
      procedureNatureLabel: resolveLastApprovedProcedureNatureLabel(doc, proceduresByDocument),
    })
  })
  if (documents.length === 1) return documentTilesListHtml(tiles)
  return `<p class="ec-fiche-info__intro">Zone d’incertitude où se superposent plusieurs documents.</p>${documentTilesListHtml(tiles)}`
}

function territoryDocumentTabLabel(id: string, defaultLabel: string): string {
  if (id === TAB_DU) return 'Documents'
  if (id === TAB_SUP) return 'SUP'
  if (id === TAB_PROCEDURES) return 'Procédures'
  return defaultLabel
}

function wrapTerritoryTabBody(
  bodyHtml: string,
  partitions: Record<string, GpuFichePartition>,
): string {
  let html = bodyHtml
  if (html && !html.includes('ec-fiche-info__section-title')) {
    html = `<h3 class="ec-fiche-info__section-title">Documents d’urbanisme</h3>${html}`
  }
  return prependNonExecutoireCalloutForPartitionMap(html, partitions)
}

function buildDocumentTabs(data: GpuFicheInfoPayload, mode: MapModeId): FicheInfoDocumentTab[] {
  const tabs: FicheInfoDocumentTab[] = []
  const proceduresByDocument = data.proceduresByDocument
  const territory = mode === MAP_MODE_TERRITORY

  const dus = normalizePartitionsMap(data.dus)
  if (mapHasProductionDocument(dus) && isFicheDocumentFamilyVisible('du')) {
    const bodyHtml = buildDuTabTilesHtml(dus, data)
    tabs.push({
      id: TAB_DU,
      label: territory
        ? territoryDocumentTabLabel(TAB_DU, 'Document d’urbanisme')
        : 'Document d’urbanisme',
      bodyHtml: territory ? wrapTerritoryTabBody(bodyHtml, dus) : bodyHtml,
    })
  }

  const psmvs = normalizePartitionsMap(data.psmvs)
  if (mapHasProductionDocument(psmvs) && isFicheDocumentFamilyVisible('psmv')) {
    const bodyHtml = buildDocumentTypeTabHtml(psmvs, 'psmv', proceduresByDocument)
    tabs.push({
      id: TAB_PSMV,
      label: territory ? territoryDocumentTabLabel(TAB_PSMV, 'PSMV') : 'PSMV',
      bodyHtml: territory ? prependNonExecutoireCalloutForPartitionMap(bodyHtml, psmvs) : bodyHtml,
    })
  }

  const sups = normalizePartitionsMap(data.sups)
  if (
    isFicheDocumentFamilyVisible('sup') &&
    (mapHasProductionDocument(sups) || data.is_el9_alert)
  ) {
    const body =
      buildGroupedSupTabHtml(sups, { isEl9Alert: data.is_el9_alert === true }) ||
      buildDocumentTypeTabHtml(sups, 'sup', proceduresByDocument)
    tabs.push({
      id: TAB_SUP,
      label: territory ? territoryDocumentTabLabel(TAB_SUP, 'Servitude') : 'Servitude',
      bodyHtml: territory ? prependNonExecutoireCalloutForPartitionMap(body, sups) : body,
    })
  }

  const scots = normalizePartitionsMap(data.scots)
  if (mapHasProductionDocument(scots) && isFicheDocumentFamilyVisible('scot')) {
    const bodyHtml = buildDuTabTilesHtml(scots, data)
    tabs.push({
      id: TAB_SCOT,
      label: territory ? territoryDocumentTabLabel(TAB_SCOT, 'SCoT') : 'SCoT',
      bodyHtml: territory ? prependNonExecutoireCalloutForPartitionMap(bodyHtml, scots) : bodyHtml,
    })
  }

  const inProgress = collectInProgressProcedures(proceduresByDocument)
  const mecProcedures = collectMecProcedures(proceduresByDocument)
  const procedureTiles = [...inProgress]
  for (const mecProc of mecProcedures) {
    if (!procedureTiles.some((p) => p.id === mecProc.id)) procedureTiles.push(mecProc)
  }
  const mecProceduresHtml = buildMecTerritoryProceduresHtml(data)
  if (isFicheDocumentFamilyVisible('mec') && (procedureTiles.length || mecProceduresHtml)) {
    let bodyHtml = procedureTiles.length ? buildProceduresTabHtml(procedureTiles) : ''
    if (mecProceduresHtml) bodyHtml += mecProceduresHtml
    if (territory) {
      bodyHtml = `<h3 class="ec-fiche-info__section-title">Procédures en cours</h3>${bodyHtml}`
    }
    tabs.push({
      id: TAB_PROCEDURES,
      label: territory
        ? territoryDocumentTabLabel(TAB_PROCEDURES, 'Procédures en cours')
        : 'Procédures en cours',
      bodyHtml,
    })
  }

  if (!tabs.some((t) => t.id === TAB_DU)) {
    const lowScaleDocs = normalizeLowScaleDocuments(data.lowScaleDocument)
    if (lowScaleDocs.length && isFicheDocumentFamilyVisible('du')) {
      tabs.unshift({
        id: TAB_DU,
        label: 'Document d’urbanisme',
        bodyHtml: buildLowScaleDocumentsHtml(lowScaleDocs, data.proceduresByDocument),
      })
    }
  }

  return tabs
}

function absorbedMunicipalityHint(data: GpuFicheInfoPayload): string {
  const deleted = data.deletedGrids ?? []
  const grid = data.grid
  if (!deleted.length || !grid?.name) return ''
  const absorbed = deleted.find((g) => g.properties?.name)?.properties?.name
  if (!absorbed) return ''
  const current = formatMunicipalityName(grid.name.trim())
  const former = formatMunicipalityName(String(absorbed).trim())
  return `<p class="ec-fiche-info__absorbed">Zone de ${escapeHtml(former)} (fusionnée au sein de la commune de ${escapeHtml(current)}).</p>`
}

function municipalityTitle(data: GpuFicheInfoPayload): string {
  const grid = data.grid
  if (!grid?.name) return 'Commune non trouvée'
  const label = formatMunicipalityName(grid.name.trim())
  const insee = grid.insee ? ` (${grid.insee})` : ''
  return `${label}${insee}`
}

function fallbackBodyHtml(data: GpuFicheInfoPayload): string {
  if (data.grid?.is_rnu) {
    return '<p>Cette commune est couverte par le Règlement National d’Urbanisme (RNU).</p>'
  }
  const lowScaleHtml = buildLowScaleDocumentsHtml(
    normalizeLowScaleDocuments(data.lowScaleDocument),
    data.proceduresByDocument,
  )
  if (lowScaleHtml) return lowScaleHtml
  return '<p>Aucun document disponible à cet emplacement.</p>'
}

export function extractParcelFichePayload(data: GpuFicheInfoPayload): GpuParcelFichePayload | null {
  if (data.parcelFiche && isGpuParcelFichePayload(data.parcelFiche)) {
    return data.parcelFiche
  }
  if (data.features?.length && isGpuParcelFichePayload({ features: data.features })) {
    return { features: data.features }
  }
  return null
}

export function ficheSelectionFromGpuApi(
  data: GpuFicheInfoPayload,
  mode: MapModeId,
  lon: number,
  lat: number,
): FicheInfoSelection {
  const hasParcel = ficheHasParcelAtPoint(data)
  const hasTerritory = ficheHasTerritoryAtPoint(data)
  const parcel = data.parcel ?? null
  const territoryTitle = hasTerritory ? municipalityTitle(data) : 'Territoire'
  const parcelLabel = hasParcel
    ? parcelShortLabel(parcel) || 'Parcelle'
    : NO_PARCEL_AT_POINT_MESSAGE
  const parcelSwitchLabel = hasParcel
    ? parcelShortLabel(parcel) || 'Parcelle'
    : NO_PARCEL_AT_POINT_MESSAGE
  const documentTabs = mode === MAP_MODE_TERRITORY ? buildDocumentTabs(data, mode) : undefined
  const bodyHtml =
    mode === MAP_MODE_TERRITORY && !documentTabs?.length ? fallbackBodyHtml(data) : undefined

  const absorbedHtml = absorbedMunicipalityHint(data)

  const base: FicheInfoSelection = {
    title: mode === MAP_MODE_PARCEL ? parcelLabel : territoryTitle,
    mapMode: mode,
    parcelLabel,
    territoryTitle,
    parcelSwitchLabel,
    parcelMissingAtPoint: !hasParcel,
    cadastreReferences: hasParcel ? cadastreReferencesFromParcel(parcel) : null,
    documentTabs: documentTabs?.length ? documentTabs : undefined,
    bodyHtml:
      mode === MAP_MODE_TERRITORY && absorbedHtml && !documentTabs?.length
        ? `${absorbedHtml}${fallbackBodyHtml(data)}`
        : bodyHtml,
    headerHtml: mode === MAP_MODE_TERRITORY && absorbedHtml ? absorbedHtml : undefined,
    raw: { ...data, lon, lat, mode, source: 'gpu-fiche-info-api' },
  }

  if (mode === MAP_MODE_PARCEL) {
    base.headerHtml = undefined
    if (!hasParcel) {
      const msg = `<p>${escapeHtml(NO_PARCEL_AT_POINT_MESSAGE)}</p>`
      base.parcelInfosHtml = msg
      base.parcelDocumentsHtml = msg
    } else {
      const parcelFiche = extractParcelFichePayload(data)
      if (parcelFiche) {
        base.parcelInfosHtml = buildParcelInfosHtmlFromFiche(parcelFiche)
        base.parcelDocumentsHtml = buildParcelDocumentsHtmlFromFiche(parcelFiche, data)
        base.raw = { ...base.raw, _parcelFiche: parcelFiche }
      } else {
        base.parcelDocumentsHtml = buildParcelDocumentsPresentationHtml(data)
        base.parcelInfosHtml = undefined
      }
    }
  }

  if (mode === MAP_MODE_TERRITORY && documentTabs?.length && absorbedHtml) {
    base.documentTabs = documentTabs.map((tab, index) =>
      index === 0 ? { ...tab, bodyHtml: `${absorbedHtml}${tab.bodyHtml}` } : tab,
    )
  }

  applyCatalogVisibilityToFicheSelection(base)
  return base
}

function extractGpuFichePayloadFromSelectionRaw(
  raw: Record<string, unknown>,
): GpuFicheInfoPayload | null {
  if (raw.source !== 'gpu-fiche-info-api') return null
  const copy: Record<string, unknown> = { ...raw }
  delete copy.lon
  delete copy.lat
  delete copy.mode
  delete copy.source
  if (!isGpuFicheInfoPayload(copy)) return null
  return copy
}

/** Recalcule Infos / Documents / onglets territoire selon les cases catalogue (hash permalink). */
export function refreshFicheSelectionCatalogVisibility(
  selection: FicheInfoSelection,
): FicheInfoSelection {
  const raw = selection.raw
  if (!raw || typeof raw !== 'object') return selection
  if (selection.loading) return selection

  const data = extractGpuFichePayloadFromSelectionRaw(raw)
  if (!data) {
    const copy: FicheInfoSelection = {
      ...selection,
      documentTabs: selection.documentTabs?.map((tab) => ({ ...tab })),
    }
    applyCatalogVisibilityToFicheSelection(copy)
    return copy
  }

  const lon = Number(raw.lon) || 0
  const lat = Number(raw.lat) || 0
  const mode = selection.mapMode ?? (raw.mode as MapModeId) ?? MAP_MODE_TERRITORY
  const rebuilt = ficheSelectionFromGpuApi(data, mode, lon, lat)

  return {
    ...selection,
    documentTabs: rebuilt.documentTabs,
    bodyHtml: rebuilt.bodyHtml,
    headerHtml: rebuilt.headerHtml,
    parcelInfosHtml: rebuilt.parcelInfosHtml,
    parcelDocumentsHtml: rebuilt.parcelDocumentsHtml,
  }
}

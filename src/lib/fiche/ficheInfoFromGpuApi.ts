import type { FicheInfoDocumentTab, FicheInfoSelection } from '@/composables/tabPanels'
import { cadastreReferencesFromParcel, parcelShortLabel } from '@/lib/fiche/ficheCadastreReferences'
import { prependNonExecutoireCalloutForPartitionMap } from '@/lib/fiche/ficheDocumentPresentation'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import { escapeHtml } from '@/lib/fiche/ficheInfoHtml'
import { coerceDisplayString } from '@/lib/coerceDisplayString'

type GpuFicheFeature = Record<string, unknown>

type GpuFicheDocument = {
  title?: string
  name?: string
  originalName?: string
  type?: string
  status?: string
  typeref?: string | null
  archiveUrl?: string
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
  grid?: { name?: string; insee?: string; is_rnu?: boolean } | null
  deletedGrids?: GpuFicheDeletedGrid[]
  /** Référentiel cadastral (CNIG), renvoyé par `/api/fiche-info` — pilote la couche cadastre basse. */
  typeref?: string | null
  dus?: Record<string, GpuFichePartition> | GpuFichePartition[]
  psmvs?: Record<string, GpuFichePartition> | GpuFichePartition[]
  sups?: Record<string, GpuFichePartition> | GpuFichePartition[]
  scots?: Record<string, GpuFichePartition> | GpuFichePartition[]
  lowScaleDocument?: Record<string, GpuFicheDocument> | GpuFicheDocument[] | null
  proceduresByDocument?: Record<string, GpuFicheProcedure[]>
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

function formatDatapproFromDocumentName(documentName: string): string | null {
  const match = documentName.match(/^([A-Z0-9]{5}|[0-9]{9})_([A-Z]+)(?:_MEC\d)?_(\d{8})/i)
  if (!match?.[3]) return null
  const date = match[3]
  return `${date.slice(6, 8)}/${date.slice(4, 6)}/${date.slice(0, 4)}`
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

function isPetFeature(feature: GpuFicheFeature): boolean {
  const nomfic = feature.nomfic
  return typeof nomfic === 'string' && nomfic.includes('_97_00_')
}

function featureLabelHtml(feature: GpuFicheFeature): string {
  if ('typezone' in feature) {
    const code = coerceDisplayString(feature.libelle)
    const label = coerceDisplayString(feature.libelong ?? feature.libelle)
    if (code && label && code !== label) {
      return `Zone classée <strong>${escapeHtml(code)}</strong>, <strong>${escapeHtml(label)}</strong>.`
    }
    if (label) return `<strong>${escapeHtml(label)}</strong>.`
    if (code) return `Zone classée <strong>${escapeHtml(code)}</strong>.`
    return 'Zonage de type inconnu'
  }
  if ('typesect' in feature) {
    const code = coerceDisplayString(feature.libelle)
    const label = coerceDisplayString(feature.libelong ?? feature.libelle)
    if (code && label) {
      return `Zone classée <strong>${escapeHtml(code)}</strong>, <strong>${escapeHtml(label)}</strong>.`
    }
    return label ? `<strong>${escapeHtml(label)}</strong>.` : 'Secteur de type inconnu'
  }
  if ('typepsc' in feature) {
    const label = coerceDisplayString(feature.libelle)
    return label ? `<strong>${escapeHtml(label)}</strong>.` : 'Prescription de type inconnue'
  }
  if ('typeinf' in feature) {
    const label = coerceDisplayString(feature.libelle)
    return label ? `<strong>${escapeHtml(label)}</strong>.` : 'Information de type inconnue'
  }
  if ('libelle' in feature) {
    const label = coerceDisplayString(feature.libelle)
    return label ? `<strong>${escapeHtml(label)}</strong>.` : ''
  }
  return ''
}

function featureEntryHtml(feature: GpuFicheFeature): string {
  const info = featureLabelHtml(feature)
  if (!info) return ''
  const urlfic = feature.urlfic
  if (typeof urlfic === 'string' && urlfic.trim()) {
    return `<p><a href="${escapeHtml(urlfic)}" target="_blank" rel="noopener noreferrer">${info}</a></p>`
  }
  return `<p>${info}</p>`
}

function buildPartitionFeaturesHtml(partition: GpuFichePartition): string {
  const features = partition.features ?? []
  const seen = new Set<string>()
  const parts: string[] = []
  for (const feature of features) {
    if (isPetFeature(feature)) continue
    const info = featureLabelHtml(feature)
    if (!info) continue
    const key = `${coerceDisplayString(feature.nomfic)}|${info}`
    if (seen.has(key)) continue
    seen.add(key)
    parts.push(featureEntryHtml(feature))
  }
  return parts.join('')
}

function documentIntroHtml(
  document: GpuFicheDocument,
  kind: 'du' | 'psmv' | 'scot' | 'sup',
): string {
  const title = document.title?.trim() || document.type || 'document'
  const documentName = document.originalName ?? document.name ?? ''
  if (kind === 'sup') {
    return document.title
      ? `<p><strong>${escapeHtml(document.title)}</strong></p>`
      : `<p><strong>${escapeHtml(documentName || 'Servitude')}</strong></p>`
  }
  if (kind === 'scot') {
    const prefix = 'Territoire couvert par '
    return `<p>${prefix}<strong>${escapeHtml(title)}</strong>.</p>`
  }
  const article = document.type === 'CC' ? 'la ' : 'le '
  let html = `<p>Parcelle couverte par ${article}<strong>${escapeHtml(title)}</strong>`
  if (documentName) {
    const datappro = formatDatapproFromDocumentName(documentName)
    if (datappro) {
      const proc =
        typeof document.typeproc_title === 'string' && document.typeproc_title.trim()
          ? ` (${document.typeproc_title.trim()})`
          : ''
      html += `, dont la dernière procédure${proc} a été approuvée le <strong>${escapeHtml(datappro)}</strong>`
    }
  }
  html += '.</p>'
  if (document.effectiveStatus === 'NON_EXECUTOIRE') {
    html += '<p><em>Ce document n’est pas exécutable en l’état.</em></p>'
  }
  return html
}

function buildNonExecutoireHint(
  document: GpuFicheDocument,
  proceduresByDocument: Record<string, GpuFicheProcedure[]> | undefined,
): string {
  const key = document.originalName ?? document.name
  if (!key || !proceduresByDocument?.[key]?.length) return ''
  const blocked = proceduresByDocument[key].some((p) => p.documentNotEnforceable === true)
  if (!blocked) return ''
  return `<p class="ec-fiche-info__warn"><strong>Ce document d’urbanisme n’est pas encore exécutable.</strong></p>`
}

function buildPartitionBlockHtml(
  partitionKey: string,
  partition: GpuFichePartition,
  kind: 'du' | 'psmv' | 'scot' | 'sup',
  proceduresByDocument?: Record<string, GpuFicheProcedure[]>,
): string {
  const document = pickProductionDocument(partition.documents)
  if (!document) {
    return `<p><strong>${escapeHtml(partitionKey)}</strong> — document indisponible.</p>`
  }
  const parts = [documentIntroHtml(document, kind)]
  parts.push(buildNonExecutoireHint(document, proceduresByDocument))
  parts.push(buildPartitionFeaturesHtml(partition))
  if (document.archiveUrl) {
    parts.push(
      `<p><a href="${escapeHtml(document.archiveUrl)}" target="_blank" rel="noopener noreferrer">Télécharger l’archive du document</a></p>`,
    )
  }
  return parts.filter(Boolean).join('')
}

function buildDocumentTypeTabHtml(
  partitions: Record<string, GpuFichePartition>,
  kind: 'du' | 'psmv' | 'scot' | 'sup',
  proceduresByDocument?: Record<string, GpuFicheProcedure[]>,
): string {
  const keys = Object.keys(partitions)
  if (!keys.length) return ''
  if (keys.length === 1) {
    return buildPartitionBlockHtml(keys[0], partitions[keys[0]], kind, proceduresByDocument)
  }
  const parts = ['<p>Zone d’incertitude où se superposent :</p><ul>']
  for (const key of keys) {
    parts.push(
      `<li>${buildPartitionBlockHtml(key, partitions[key], kind, proceduresByDocument)}</li>`,
    )
  }
  parts.push('</ul>')
  return parts.join('')
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

function buildProceduresTabHtml(procedures: GpuFicheProcedure[]): string {
  if (!procedures.length) return ''
  const parts = ['<ul class="ec-fiche-info__proc-list">']
  for (const procedure of procedures) {
    const typeLabel = procedure.procedureType?.title ?? procedure.documentType ?? 'Procédure'
    const docName = procedure.documentName ?? procedure.name ?? ''
    const gridTitle = procedure.grid?.title ?? procedure.grid?.name ?? ''
    parts.push('<li>')
    parts.push(
      `<p><strong>${escapeHtml(typeLabel)}</strong>${docName ? ` — ${escapeHtml(docName)}` : ''}${gridTitle ? ` (${escapeHtml(gridTitle)})` : ''}</p>`,
    )
    if (procedure.approbationDate) {
      parts.push(`<p>Date d’approbation : ${escapeHtml(procedure.approbationDate)}</p>`)
    }
    const files = procedure.files ?? []
    if (files.length) {
      parts.push('<ul>')
      for (const file of files) {
        const label = file.title ?? file.name ?? 'Pièce'
        if (file.url) {
          parts.push(
            `<li><a href="${escapeHtml(file.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></li>`,
          )
        } else {
          parts.push(`<li>${escapeHtml(label)}</li>`)
        }
      }
      parts.push('</ul>')
    }
    parts.push('</li>')
  }
  parts.push('</ul>')
  return parts.join('')
}

function buildCoastlineSupHint(): string {
  return `<p class="ec-fiche-info__warn"><strong>SUP EL9</strong> — servitude longitudinale littoral (domaine public maritime).</p>`
}

function normalizeLowScaleDocuments(
  value: GpuFicheInfoPayload['lowScaleDocument'],
): GpuFicheDocument[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'object') return Object.values(value)
  return []
}

function buildLowScaleDocumentsHtml(documents: GpuFicheDocument[]): string {
  if (!documents.length) return ''
  if (documents.length === 1) {
    return documentIntroHtml(documents[0], 'du')
  }
  const parts = ['<p>Zone d’incertitude où se superposent :</p><ul>']
  for (const doc of documents) {
    parts.push(`<li>${documentIntroHtml(doc, 'du')}</li>`)
  }
  parts.push('</ul>')
  return parts.join('')
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
  if (mapHasProductionDocument(dus)) {
    const bodyHtml = buildDocumentTypeTabHtml(dus, 'du', proceduresByDocument)
    tabs.push({
      id: TAB_DU,
      label: territory
        ? territoryDocumentTabLabel(TAB_DU, 'Document d’urbanisme')
        : 'Document d’urbanisme',
      bodyHtml: territory ? wrapTerritoryTabBody(bodyHtml, dus) : bodyHtml,
    })
  }

  const psmvs = normalizePartitionsMap(data.psmvs)
  if (mapHasProductionDocument(psmvs)) {
    const bodyHtml = buildDocumentTypeTabHtml(psmvs, 'psmv', proceduresByDocument)
    tabs.push({
      id: TAB_PSMV,
      label: territory ? territoryDocumentTabLabel(TAB_PSMV, 'PSMV') : 'PSMV',
      bodyHtml: territory ? prependNonExecutoireCalloutForPartitionMap(bodyHtml, psmvs) : bodyHtml,
    })
  }

  const sups = normalizePartitionsMap(data.sups)
  if (mapHasProductionDocument(sups)) {
    let body = buildDocumentTypeTabHtml(sups, 'sup', proceduresByDocument)
    if (data.is_el9_alert) body += buildCoastlineSupHint()
    tabs.push({
      id: TAB_SUP,
      label: territory ? territoryDocumentTabLabel(TAB_SUP, 'Servitude') : 'Servitude',
      bodyHtml: territory ? prependNonExecutoireCalloutForPartitionMap(body, sups) : body,
    })
  }

  const scots = normalizePartitionsMap(data.scots)
  if (mapHasProductionDocument(scots)) {
    const bodyHtml = buildDocumentTypeTabHtml(scots, 'scot', proceduresByDocument)
    tabs.push({
      id: TAB_SCOT,
      label: territory ? territoryDocumentTabLabel(TAB_SCOT, 'SCoT') : 'SCoT',
      bodyHtml: territory ? prependNonExecutoireCalloutForPartitionMap(bodyHtml, scots) : bodyHtml,
    })
  }

  const inProgress = collectInProgressProcedures(proceduresByDocument)
  if (inProgress.length) {
    let bodyHtml = buildProceduresTabHtml(inProgress)
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
    if (lowScaleDocs.length) {
      tabs.unshift({
        id: TAB_DU,
        label: 'Document d’urbanisme',
        bodyHtml: buildLowScaleDocumentsHtml(lowScaleDocs),
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
  const lowScaleHtml = buildLowScaleDocumentsHtml(normalizeLowScaleDocuments(data.lowScaleDocument))
  if (lowScaleHtml) return lowScaleHtml
  return '<p>Aucun document disponible à cet emplacement.</p>'
}

export function ficheSelectionFromGpuApi(
  data: GpuFicheInfoPayload,
  mode: MapModeId,
  lon: number,
  lat: number,
): FicheInfoSelection {
  const parcel = data.parcel ?? null
  const territoryTitle = municipalityTitle(data)
  const parcelLabel = parcelShortLabel(parcel) || 'Parcelle'
  const documentTabs = mode === MAP_MODE_TERRITORY ? buildDocumentTabs(data, mode) : undefined
  const bodyHtml =
    mode === MAP_MODE_TERRITORY && !documentTabs?.length ? fallbackBodyHtml(data) : undefined

  const absorbedHtml = absorbedMunicipalityHint(data)

  const base: FicheInfoSelection = {
    title: mode === MAP_MODE_PARCEL ? parcelLabel : territoryTitle,
    mapMode: mode,
    parcelLabel,
    territoryTitle,
    cadastreReferences: cadastreReferencesFromParcel(parcel),
    documentTabs: documentTabs?.length ? documentTabs : undefined,
    bodyHtml:
      mode === MAP_MODE_TERRITORY && absorbedHtml && !documentTabs?.length
        ? `${absorbedHtml}${fallbackBodyHtml(data)}`
        : bodyHtml,
    headerHtml: mode === MAP_MODE_TERRITORY && absorbedHtml ? absorbedHtml : undefined,
    raw: { ...data, lon, lat, mode, source: 'gpu-fiche-info-api' },
  }

  if (mode === MAP_MODE_PARCEL) {
    base.parcelInfosHtml = undefined
    base.parcelDocumentsHtml = undefined
    base.headerHtml = undefined
  }

  if (mode === MAP_MODE_TERRITORY && documentTabs?.length && absorbedHtml) {
    base.documentTabs = documentTabs.map((tab, index) =>
      index === 0 ? { ...tab, bodyHtml: `${absorbedHtml}${tab.bodyHtml}` } : tab,
    )
  }

  return base
}

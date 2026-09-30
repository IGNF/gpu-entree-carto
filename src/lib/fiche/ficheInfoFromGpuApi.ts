import type { FicheInfoDocumentTab, FicheInfoSelection } from '@/composables/tabPanels'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import { escapeHtml, htmlParagraph } from '@/lib/fiche/ficheInfoHtml'

type GpuFicheFeature = Record<string, unknown>

type GpuFicheDocument = {
  title?: string
  name?: string
  originalName?: string
  type?: string
  status?: string
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

export type GpuFicheInfoPayload = {
  parcel?: Record<string, unknown> | null
  grid?: { name?: string; insee?: string; is_rnu?: boolean } | null
  dus?: Record<string, GpuFichePartition> | GpuFichePartition[]
  psmvs?: Record<string, GpuFichePartition> | GpuFichePartition[]
  sups?: Record<string, GpuFichePartition> | GpuFichePartition[]
  scots?: Record<string, GpuFichePartition> | GpuFichePartition[]
  lowScaleDocument?: unknown
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
    const code = String(feature.libelle ?? '')
    const label = String(feature.libelong ?? feature.libelle ?? '')
    if (code && label && code !== label) {
      return `Zone classée <strong>${escapeHtml(code)}</strong>, <strong>${escapeHtml(label)}</strong>.`
    }
    if (label) return `<strong>${escapeHtml(label)}</strong>.`
    if (code) return `Zone classée <strong>${escapeHtml(code)}</strong>.`
    return 'Zonage de type inconnu'
  }
  if ('typesect' in feature) {
    const code = String(feature.libelle ?? '')
    const label = String(feature.libelong ?? feature.libelle ?? '')
    if (code && label) {
      return `Zone classée <strong>${escapeHtml(code)}</strong>, <strong>${escapeHtml(label)}</strong>.`
    }
    return label ? `<strong>${escapeHtml(label)}</strong>.` : 'Secteur de type inconnu'
  }
  if ('typepsc' in feature) {
    const label = String(feature.libelle ?? '')
    return label ? `<strong>${escapeHtml(label)}</strong>.` : 'Prescription de type inconnue'
  }
  if ('typeinf' in feature) {
    const label = String(feature.libelle ?? '')
    return label ? `<strong>${escapeHtml(label)}</strong>.` : 'Information de type inconnue'
  }
  if ('libelle' in feature) {
    const label = String(feature.libelle ?? '')
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
    const key = `${String(feature.nomfic ?? '')}|${info}`
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
  const blocked = proceduresByDocument[key]!.some((p) => p.documentNotEnforceable === true)
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
    return buildPartitionBlockHtml(keys[0]!, partitions[keys[0]!]!, kind, proceduresByDocument)
  }
  const parts = ['<p>Zone d’incertitude où se superposent :</p><ul>']
  for (const key of keys) {
    parts.push(
      `<li>${buildPartitionBlockHtml(key, partitions[key]!, kind, proceduresByDocument)}</li>`,
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

function buildDocumentTabs(data: GpuFicheInfoPayload): FicheInfoDocumentTab[] {
  const tabs: FicheInfoDocumentTab[] = []
  const proceduresByDocument = data.proceduresByDocument

  const dus = normalizePartitionsMap(data.dus)
  if (mapHasProductionDocument(dus)) {
    tabs.push({
      id: TAB_DU,
      label: 'Document d’urbanisme',
      bodyHtml: buildDocumentTypeTabHtml(dus, 'du', proceduresByDocument),
    })
  }

  const psmvs = normalizePartitionsMap(data.psmvs)
  if (mapHasProductionDocument(psmvs)) {
    tabs.push({
      id: TAB_PSMV,
      label: 'PSMV',
      bodyHtml: buildDocumentTypeTabHtml(psmvs, 'psmv', proceduresByDocument),
    })
  }

  const sups = normalizePartitionsMap(data.sups)
  if (mapHasProductionDocument(sups)) {
    let body = buildDocumentTypeTabHtml(sups, 'sup', proceduresByDocument)
    if (data.is_el9_alert) body += buildCoastlineSupHint()
    tabs.push({
      id: TAB_SUP,
      label: 'Servitude',
      bodyHtml: body,
    })
  }

  const scots = normalizePartitionsMap(data.scots)
  if (mapHasProductionDocument(scots)) {
    tabs.push({
      id: TAB_SCOT,
      label: 'SCoT',
      bodyHtml: buildDocumentTypeTabHtml(scots, 'scot', proceduresByDocument),
    })
  }

  const inProgress = collectInProgressProcedures(proceduresByDocument)
  if (inProgress.length) {
    tabs.push({
      id: TAB_PROCEDURES,
      label: 'Procédures en cours',
      bodyHtml: buildProceduresTabHtml(inProgress),
    })
  }

  return tabs
}

function buildParcelHeaderHtml(
  parcel: Record<string, unknown> | null | undefined,
  lon: number,
  lat: number,
): string {
  if (!parcel?.idu && !parcel?.numero) {
    return '<p>Aucune parcelle cadastrale à cet emplacement.</p>'
  }
  const parts = [
    htmlParagraph('Commune', String(parcel.nom_com ?? '')),
    htmlParagraph('Section', String(parcel.section ?? '')),
    htmlParagraph('Numéro', String(parcel.numero ?? '')),
    htmlParagraph('Contenance', parcel.contenance != null ? `${parcel.contenance} m²` : ''),
    htmlParagraph('Code INSEE', String(parcel.code_insee ?? '')),
    htmlParagraph('Identifiant', String(parcel.idu ?? parcel.id ?? '')),
    htmlParagraph('Coordonnées', `${lon.toFixed(5)}, ${lat.toFixed(5)}`),
  ].filter(Boolean)
  return parts.join('') || '<p>Parcelle identifiée.</p>'
}

function parcelTitle(parcel: Record<string, unknown> | null | undefined): string {
  if (!parcel) return 'Parcelle'
  const section = String(parcel.section ?? '')
  const numero = String(parcel.numero ?? '')
  const idu = String(parcel.idu ?? '')
  if (section && numero) return `Parcelle ${section} ${numero}`
  if (idu) return `Parcelle ${idu}`
  return 'Parcelle cadastrale'
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
  if (data.lowScaleDocument) {
    return '<p>Zoomer davantage pour afficher les documents d’urbanisme à cette échelle.</p>'
  }
  return '<p>Aucun document disponible à cet emplacement.</p>'
}

export function ficheSelectionFromGpuApi(
  data: GpuFicheInfoPayload,
  mode: MapModeId,
  lon: number,
  lat: number,
): FicheInfoSelection {
  const parcel = data.parcel ?? null
  const documentTabs = buildDocumentTabs(data)
  const bodyHtml = documentTabs.length ? undefined : fallbackBodyHtml(data)

  const base: FicheInfoSelection = {
    title: mode === MAP_MODE_PARCEL ? parcelTitle(parcel) : municipalityTitle(data),
    documentTabs: documentTabs.length ? documentTabs : undefined,
    bodyHtml,
    raw: { ...data, lon, lat, mode, source: 'gpu-fiche-info-api' },
  }

  if (mode === MAP_MODE_PARCEL) {
    base.headerHtml = buildParcelHeaderHtml(parcel, lon, lat)
  } else if (mode === MAP_MODE_TERRITORY) {
    base.headerHtml = undefined
  }

  return base
}

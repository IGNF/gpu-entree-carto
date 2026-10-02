import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import { escapeHtml } from '@/lib/fiche/ficheInfoHtml'

type GpuFicheDocument = {
  title?: string
  name?: string
  originalName?: string
  type?: string
  status?: string
  effectiveStatus?: string
  archiveUrl?: string
  typeproc_title?: string
}

type GpuFichePartition = {
  documents?: GpuFicheDocument[]
}

const NON_EXECUTOIRE_MESSAGE =
  'Certains documents ne sont pas exécutoires ; consultez l’historique du document pour connaître le document en vigueur.'

export const FICHE_NON_EXECUTOIRE_CALLOUT_HTML = `<aside class="ec-fiche-info__callout" role="note">${escapeHtml(NON_EXECUTOIRE_MESSAGE)}</aside>`

function normalizePartitionsMap(
  value: Record<string, GpuFichePartition> | GpuFichePartition[] | null | undefined,
): Record<string, GpuFichePartition> {
  if (!value) return {}
  if (Array.isArray(value)) return {}
  return value
}

function pickProductionDocument(
  documents: GpuFicheDocument[] | undefined,
): GpuFicheDocument | null {
  if (!documents?.length) return null
  const production = documents.filter((d) => d.status === 'document.production')
  return production[0] ?? documents[0] ?? null
}

function formatDatapproFromDocumentName(documentName: string): string | null {
  const match = documentName.match(/^([A-Z0-9]{5}|[0-9]{9})_([A-Z]+)(?:_MEC\d)?_(\d{8})/i)
  if (!match?.[3]) return null
  const date = match[3]
  return `${date.slice(6, 8)}/${date.slice(4, 6)}/${date.slice(0, 4)}`
}

function documentIsNonExecutoire(document: GpuFicheDocument): boolean {
  return document.effectiveStatus === 'NON_EXECUTOIRE'
}

function collectProductionDocuments(map: Record<string, GpuFichePartition>): GpuFicheDocument[] {
  const out: GpuFicheDocument[] = []
  for (const partition of Object.values(map)) {
    const doc = pickProductionDocument(partition.documents)
    if (doc) out.push(doc)
  }
  return out
}

export function fichePayloadHasNonExecutoireDocument(data: GpuFicheInfoPayload): boolean {
  const maps = [
    normalizePartitionsMap(data.dus),
    normalizePartitionsMap(data.psmvs),
    normalizePartitionsMap(data.sups),
    normalizePartitionsMap(data.scots),
  ]
  for (const map of maps) {
    if (collectProductionDocuments(map).some(documentIsNonExecutoire)) return true
  }
  return false
}

function documentCardHtml(document: GpuFicheDocument, href?: string): string {
  const title = document.title?.trim() || document.type || 'Document'
  const name = document.originalName ?? document.name ?? ''
  const datappro = name ? formatDatapproFromDocumentName(name) : null
  const approved = document.status === 'document.production'
  const inForce = document.effectiveStatus !== 'NON_EXECUTOIRE'
  const badges = [
    inForce
      ? '<span class="ec-fiche-info__badge ec-fiche-info__badge--vigueur">EN VIGUEUR</span>'
      : '',
    approved
      ? '<span class="ec-fiche-info__badge ec-fiche-info__badge--approuve">APPROUVÉ</span>'
      : '',
  ]
    .filter(Boolean)
    .join('')
  const titleInner = escapeHtml(title)
  const titleBlock = href
    ? `<a class="ec-fiche-info__doc-card-title" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${titleInner}</a>`
    : `<p class="ec-fiche-info__doc-card-title">${titleInner}</p>`
  const footer = datappro
    ? `<p class="ec-fiche-info__doc-card-meta">Dernière procédure approuvée le : ${escapeHtml(datappro)}</p>`
    : ''
  return `<article class="ec-fiche-info__doc-card">${badges ? `<div class="ec-fiche-info__doc-card-badges">${badges}</div>` : ''}${titleBlock}${footer}</article>`
}

const SECTION_TITLES: Record<string, string> = {
  du: 'Documents d’urbanisme',
  psmv: 'Plans de sauvegarde et de mise en valeur (PSMV)',
  sup: 'Servitudes d’utilité publique',
  scot: 'Schémas de cohérence territoriale',
}

function sectionBlock(kind: keyof typeof SECTION_TITLES, documents: GpuFicheDocument[]): string {
  if (!documents.length) return ''
  const cards = documents.map((d) => documentCardHtml(d, d.archiveUrl)).join('')
  return `<h3 class="ec-fiche-info__section-title">${escapeHtml(SECTION_TITLES[kind] ?? kind)}</h3>${cards}`
}

/** Liste cartes documents (onglet Documents mode Parcelle). */
export function buildParcelDocumentsPresentationHtml(data: GpuFicheInfoPayload): string {
  const parts: string[] = []
  if (fichePayloadHasNonExecutoireDocument(data)) {
    parts.push(FICHE_NON_EXECUTOIRE_CALLOUT_HTML)
  }
  parts.push(
    '<p class="ec-fiche-info__intro">La parcelle est couverte par les documents suivants :</p>',
  )

  const dus = collectProductionDocuments(normalizePartitionsMap(data.dus))
  const psmvs = collectProductionDocuments(normalizePartitionsMap(data.psmvs))
  const sups = collectProductionDocuments(normalizePartitionsMap(data.sups))
  const scots = collectProductionDocuments(normalizePartitionsMap(data.scots))

  parts.push(sectionBlock('du', dus))
  parts.push(sectionBlock('psmv', psmvs))
  parts.push(sectionBlock('sup', sups))
  parts.push(sectionBlock('scot', scots))

  const body = parts.filter(Boolean).join('')
  return body || '<p>Aucun document disponible pour cette parcelle.</p>'
}

export function prependNonExecutoireCalloutIfNeeded(
  bodyHtml: string,
  data: GpuFicheInfoPayload,
): string {
  if (!fichePayloadHasNonExecutoireDocument(data)) return bodyHtml
  if (bodyHtml.includes('ec-fiche-info__callout')) return bodyHtml
  return FICHE_NON_EXECUTOIRE_CALLOUT_HTML + bodyHtml
}

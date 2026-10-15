import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import { isFicheDocumentFamilyVisible } from '@/lib/fiche/ficheCatalogVisibilityFilter'
import { escapeHtml } from '@/lib/fiche/ficheInfoHtml'
import {
  documentSupTileHtml,
  documentTileHrefFromApiFields,
  documentTilesListHtml,
  documentUrbanismTileHtml,
} from '@/lib/fiche/ficheDocumentTiles'
import { readSupCategories } from '@/lib/fiche/parcelLegendImage'
import { supCategoryForDocument, supCategoryLibelle } from '@/lib/fiche/ficheSupGroupedPresentation'

type GpuFicheDocument = {
  id?: string
  title?: string
  name?: string
  originalName?: string
  type?: string
  status?: string
  effectiveStatus?: string
  legalStatus?: string
  archiveUrl?: string
  viewUrl?: string
  typeproc_title?: string
  typepsc?: string
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

export function formatDatapproFromDocumentName(documentName: string): string | null {
  const match = documentName.match(/^([A-Z0-9]{5}|[0-9]{9})_([A-Z]+)(?:_MEC\d)?_(\d{8})/i)
  if (!match?.[3]) return null
  const date = match[3]
  return `${date.slice(6, 8)}/${date.slice(4, 6)}/${date.slice(0, 4)}`
}

export type FicheProcedureNatureSource = {
  inProgress?: boolean
  procedureType?: { title?: string }
  name?: string
}

/** Libellé nature (ex. « Mise à jour n°2 ») : document enrichi gpu-site ou dernière procédure approuvée. */
export function resolveLastApprovedProcedureNatureLabel(
  document: { originalName?: string; name?: string; typeproc_title?: string },
  proceduresByDocument?: Record<string, FicheProcedureNatureSource[]>,
): string | null {
  const fromDocument = document.typeproc_title?.trim()
  if (fromDocument) return fromDocument

  if (!proceduresByDocument) return null
  const keys = [document.originalName, document.name].filter(
    (key): key is string => typeof key === 'string' && key.length > 0,
  )
  for (const key of keys) {
    const procedures = proceduresByDocument[key]
    if (!procedures?.length) continue
    const approved = procedures.find((procedure) => procedure.inProgress !== true)
    if (!approved) continue
    const title = approved.procedureType?.title?.trim() || approved.name?.trim() || null
    if (title) return title
  }
  return null
}

/** « Procédure de révision » / « Procédure d'élaboration » à partir du libellé nature. */
export function procedureNaturePhraseForTileDetail(nature: string): string {
  const trimmed = nature.trim()
  if (!trimmed) return trimmed
  const lowerFirst = trimmed.charAt(0).toLocaleLowerCase('fr-FR') + trimmed.slice(1)
  if (/^[aeiouyéèêëàâäùûüîïôöh]/i.test(trimmed)) {
    return `Procédure d'${lowerFirst}`
  }
  return `Procédure de ${lowerFirst}`
}

export function lastApprovedProcedureTileDetail(
  datapproLabel: string | null | undefined,
  procedureNatureLabel: string | null | undefined,
): string | null {
  const date = datapproLabel?.trim()
  const nature = procedureNatureLabel?.trim()
  if (nature && date) {
    return `${procedureNaturePhraseForTileDetail(nature)} approuvée le ${date}`
  }
  if (date) return `Dernière procédure approuvée le : ${date}`
  return null
}

export const DOCUMENT_PREVIEW_STATUS = 'document.preview'

export function documentIsPreviewStatus(status: string | undefined): boolean {
  return status === DOCUMENT_PREVIEW_STATUS
}

export const DOCUMENT_PREVIEW_BADGE_HTML =
  '<span class="ec-fiche-info__badge ec-fiche-info__badge--preview">PRÉVISUALISATION</span>'

export function documentIsNonExecutoireEffectiveStatus(
  effectiveStatus: string | undefined,
): boolean {
  return effectiveStatus === 'NON_EXECUTOIRE'
}

function documentIsNonExecutoire(document: GpuFicheDocument): boolean {
  return documentIsNonExecutoireEffectiveStatus(document.effectiveStatus)
}

/** Badges EN VIGUEUR / NON EXÉCUTOIRE + APPROUVÉ pour une carte document. */
export function documentCardBadgesHtml(options: {
  effectiveStatus?: string
  status?: string
  /** Fiche parcelle WFS : statut absent → considéré approuvé (comportement historique). */
  defaultApprovedWhenStatusMissing?: boolean
}): string {
  const { effectiveStatus, status, defaultApprovedWhenStatusMissing } = options
  if (documentIsPreviewStatus(status)) {
    return DOCUMENT_PREVIEW_BADGE_HTML
  }
  const nonExecutoire = documentIsNonExecutoireEffectiveStatus(effectiveStatus)
  const approved = status === 'document.production' || (defaultApprovedWhenStatusMissing && !status)
  const badges = [
    nonExecutoire
      ? '<span class="ec-fiche-info__badge ec-fiche-info__badge--non-executoire">NON EXÉCUTOIRE</span>'
      : '<span class="ec-fiche-info__badge ec-fiche-info__badge--vigueur">EN VIGUEUR</span>',
    approved
      ? '<span class="ec-fiche-info__badge ec-fiche-info__badge--approuve">APPROUVÉ</span>'
      : '',
  ]
    .filter(Boolean)
    .join('')
  return badges
}

function collectProductionDocuments(map: Record<string, GpuFichePartition>): GpuFicheDocument[] {
  const out: GpuFicheDocument[] = []
  for (const partition of Object.values(map)) {
    const doc = pickProductionDocument(partition.documents)
    if (doc) out.push(doc)
  }
  return out
}

export function partitionMapHasNonExecutoireDocument(
  map: Record<string, GpuFichePartition>,
): boolean {
  return collectProductionDocuments(map).some(documentIsNonExecutoire)
}

export function fichePayloadHasNonExecutoireDocument(data: GpuFicheInfoPayload): boolean {
  const maps = [
    normalizePartitionsMap(data.dus),
    normalizePartitionsMap(data.psmvs),
    normalizePartitionsMap(data.sups),
    normalizePartitionsMap(data.scots),
  ]
  return maps.some(partitionMapHasNonExecutoireDocument)
}

function documentTileFromGpuDocument(
  document: GpuFicheDocument,
  kind: 'du' | 'psmv' | 'scot' | 'sup',
  proceduresByDocument?: GpuFicheInfoPayload['proceduresByDocument'],
): string {
  const title = document.title?.trim() || document.type || 'Document'
  const name = document.originalName ?? document.name ?? ''
  const datappro = name ? formatDatapproFromDocumentName(name) : null
  const procedureNatureLabel = resolveLastApprovedProcedureNatureLabel(
    document,
    proceduresByDocument,
  )
  const href = documentTileHrefFromApiFields(document)
  if (kind === 'sup') {
    const category = supCategoryForDocument(document, readSupCategories())
    return documentSupTileHtml({
      title: supCategoryLibelle(category),
      detail: title,
      href,
    })
  }
  return documentUrbanismTileHtml({
    title,
    href,
    effectiveStatus: document.effectiveStatus,
    legalStatus: document.legalStatus,
    status: document.status,
    datapproLabel: datappro,
    procedureNatureLabel,
  })
}

const SECTION_TITLES: Record<string, string> = {
  du: 'Documents d’urbanisme',
  psmv: 'Plans de sauvegarde et de mise en valeur (PSMV)',
  sup: 'Servitudes d’utilité publique',
  scot: 'Schémas de cohérence territoriale',
}

function sectionBlock(
  kind: keyof typeof SECTION_TITLES,
  documents: GpuFicheDocument[],
  proceduresByDocument?: GpuFicheInfoPayload['proceduresByDocument'],
): string {
  if (!documents.length) return ''
  const tileKind =
    kind === 'sup' ? 'sup' : kind === 'scot' ? 'scot' : kind === 'psmv' ? 'psmv' : 'du'
  const tiles = documents.map((d) => documentTileFromGpuDocument(d, tileKind, proceduresByDocument))
  return `<h3 class="ec-fiche-info__section-title">${escapeHtml(SECTION_TITLES[kind] ?? kind)}</h3>${documentTilesListHtml(tiles)}`
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

  const proceduresByDocument = data.proceduresByDocument
  if (isFicheDocumentFamilyVisible('du')) parts.push(sectionBlock('du', dus, proceduresByDocument))
  if (isFicheDocumentFamilyVisible('psmv')) {
    parts.push(sectionBlock('psmv', psmvs, proceduresByDocument))
  }
  if (isFicheDocumentFamilyVisible('sup'))
    parts.push(sectionBlock('sup', sups, proceduresByDocument))
  if (isFicheDocumentFamilyVisible('scot')) {
    parts.push(sectionBlock('scot', scots, proceduresByDocument))
  }

  const body = parts.filter(Boolean).join('')
  return body || '<p>Aucun document disponible pour cette parcelle.</p>'
}

/** Tuiles DSFR pour un onglet territoire (liste de documents production par partition). */
export function buildDocumentTypeTabTilesHtml(
  partitions: Record<string, GpuFichePartition>,
  kind: 'du' | 'psmv' | 'scot' | 'sup',
  proceduresByDocument?: GpuFicheInfoPayload['proceduresByDocument'],
): string {
  const keys = Object.keys(partitions)
  if (!keys.length) return ''
  const documents = collectProductionDocuments(partitions)
  if (!documents.length) return ''
  const tiles = documents.map((d) => documentTileFromGpuDocument(d, kind, proceduresByDocument))
  const list = documentTilesListHtml(tiles)
  if (keys.length > 1) {
    return `<p class="ec-fiche-info__intro">Zone d’incertitude où se superposent plusieurs documents.</p>${list}`
  }
  return list
}

/** Encart non exécutoire pour un onglet territoire (documents de la partition concernée uniquement). */
export function prependNonExecutoireCalloutForPartitionMap(
  bodyHtml: string,
  map: Record<string, GpuFichePartition>,
): string {
  if (!partitionMapHasNonExecutoireDocument(map)) return bodyHtml
  if (bodyHtml.includes('ec-fiche-info__callout')) return bodyHtml
  return FICHE_NON_EXECUTOIRE_CALLOUT_HTML + bodyHtml
}

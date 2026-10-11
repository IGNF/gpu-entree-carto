import { coerceDisplayString } from '@/lib/coerceDisplayString'
import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import { escapeHtml } from '@/lib/fiche/ficheInfoHtml'
import {
  documentTileHrefFromApiFields,
  documentTilesListHtml,
  procedureTileHtml,
} from '@/lib/fiche/ficheDocumentTiles'
import { resolveMecDocumentTileHref } from '@/lib/fiche/ficheGpuSiteUrls'

export const MEC_DOCUMENT_NOTICE =
  'Une ou plusieurs zones de ce document ont été modifiées par une procédure de mise en compatibilité.'

type GpuFichePartition = {
  documents?: Array<Record<string, unknown>>
}

function normalizePartitionsMap(
  value: Record<string, GpuFichePartition> | GpuFichePartition[] | null | undefined,
): Record<string, GpuFichePartition> {
  if (!value || Array.isArray(value)) return {}
  return value
}

/** Équivalent client de gpu-site {@see FicheInfoFeatureAssembler::getDocumentPartitionByMecPartition}. */
export function documentPartitionKeyFromMecPartition(mecPartition: string): string {
  return mecPartition.replace(/^MEC(_\d+)?_/i, '')
}

function normalizeDocKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/^(DU|SCOT)_/i, '')
}

function isGpuSiteDocumentRecord(doc: Record<string, unknown>): boolean {
  const id = coerceDisplayString(doc.id).trim()
  return /^[a-f0-9]{32}$/i.test(id)
}

/** Partition MEC enrichie gpu-site (ignore les clés issues seules du WFS). */
function mecPartitionHasGpuSiteDocument(partition: GpuFichePartition): boolean {
  return (partition.documents ?? []).some(isGpuSiteDocumentRecord)
}

/**
 * Le document affiché est-il ciblé par une partition MEC (mecsDu / mecsScot) ?
 * Ne pas confondre avec `notUnforceableByDocument` (procédures non exécutoires sans lien MEC).
 */
export function documentNameAffectedByMec(
  data: GpuFicheInfoPayload,
  documentName: string,
  documentPartitionName?: string,
): boolean {
  const original = documentName.trim()
  if (!original) return false

  const partitionLabel = documentPartitionName?.trim()
  const originalKey = normalizeDocKey(original)
  const partitionKey = partitionLabel ? normalizeDocKey(partitionLabel) : ''

  for (const map of [normalizePartitionsMap(data.mecsDu), normalizePartitionsMap(data.mecsScot)]) {
    for (const [mecPartitionKey, partition] of Object.entries(map)) {
      if (!/^MEC_\d+_/i.test(mecPartitionKey)) continue
      if (!mecPartitionHasGpuSiteDocument(partition)) continue
      const parentKey = documentPartitionKeyFromMecPartition(mecPartitionKey).trim().toUpperCase()
      const parentBody = normalizeDocKey(parentKey)

      if (original.toUpperCase() === parentKey) return true
      if (partitionLabel && partitionLabel.toUpperCase() === parentKey) return true
      if (originalKey && parentBody && originalKey === parentBody) return true
      if (partitionKey && parentBody && partitionKey === parentBody) return true
    }
  }

  return false
}

export function mecNoticeHtmlForDocumentName(
  data: GpuFicheInfoPayload,
  documentName: string,
  documentPartitionName?: string,
): string | undefined {
  return documentNameAffectedByMec(data, documentName, documentPartitionName)
    ? escapeHtml(MEC_DOCUMENT_NOTICE)
    : undefined
}

function pickProductionDocument(
  documents: Array<Record<string, unknown>> | undefined,
): Record<string, unknown> | null {
  if (!documents?.length) return null
  const production = documents.filter((d) => d.status === 'document.production')
  return production[0] ?? documents[0] ?? null
}

/** Tuile procédure MEC (territoire onglet Procédures, parcelle onglet Documents). */
export function mecProcedureTileHtmlFromGpuDocument(doc: Record<string, unknown>): string | null {
  if (!isGpuSiteDocumentRecord(doc)) return null
  const title =
    coerceDisplayString(doc.title) || coerceDisplayString(doc.type) || 'Mise en compatibilité'
  return procedureTileHtml({
    title,
    href: resolveMecDocumentTileHref({
      documentId: coerceDisplayString(doc.id),
      viewUrl: typeof doc.viewUrl === 'string' ? doc.viewUrl : undefined,
    }),
    inProgress: true,
    detailLine: MEC_DOCUMENT_NOTICE,
  })
}

function partitionEntry(
  map: Record<string, GpuFichePartition>,
  partitionKey: string,
): GpuFichePartition | null {
  const trimmed = partitionKey.trim()
  if (!trimmed) return null
  if (map[trimmed]) return map[trimmed]
  const found = Object.entries(map).find(([k]) => k.toLowerCase() === trimmed.toLowerCase())
  return found?.[1] ?? null
}

/** Document MEC gpu-site pour une partition MEC WFS (clé exacte, puis même document parent). */
export function findGpuSiteMecDocument(
  data: GpuFicheInfoPayload,
  mecPartitionKey: string,
): Record<string, unknown> | null {
  const trimmed = mecPartitionKey.trim()
  if (!trimmed) return null

  for (const map of [normalizePartitionsMap(data.mecsDu), normalizePartitionsMap(data.mecsScot)]) {
    const exact = partitionEntry(map, trimmed)
    const doc = pickProductionDocument(exact?.documents)
    if (doc && isGpuSiteDocumentRecord(doc)) return doc
  }

  const parent = documentPartitionKeyFromMecPartition(trimmed).toLowerCase()
  for (const map of [normalizePartitionsMap(data.mecsDu), normalizePartitionsMap(data.mecsScot)]) {
    for (const [key, partition] of Object.entries(map)) {
      if (documentPartitionKeyFromMecPartition(key).toLowerCase() !== parent) continue
      const doc = pickProductionDocument(partition.documents)
      if (doc && isGpuSiteDocumentRecord(doc)) return doc
    }
  }

  return null
}

/** Tuile MEC parcelle alignée sur le rendu territoire. */
export function mecProcedureTileHtmlForParcelFeature(
  data: GpuFicheInfoPayload | null | undefined,
  options: {
    mecPartitionKey?: string
    fallbackTitle?: string
    fallbackDocumentId?: string
  },
): string {
  const mecPartitionKey = options.mecPartitionKey?.trim() ?? ''
  if (data && mecPartitionKey) {
    const doc = findGpuSiteMecDocument(data, mecPartitionKey)
    if (doc) {
      const tile = mecProcedureTileHtmlFromGpuDocument(doc)
      if (tile) return tile
    }
  }

  const title = options.fallbackTitle?.trim() || 'Mise en compatibilité'
  return procedureTileHtml({
    title,
    href: resolveMecDocumentTileHref({
      documentId: options.fallbackDocumentId,
    }),
    inProgress: true,
    detailLine: MEC_DOCUMENT_NOTICE,
  })
}

/** Tuiles MEC + procédures MEC pour l’onglet Procédures (territoire). */
export function buildMecTerritoryProceduresHtml(data: GpuFicheInfoPayload): string {
  const tiles: string[] = []

  for (const map of [normalizePartitionsMap(data.mecsDu), normalizePartitionsMap(data.mecsScot)]) {
    for (const partition of Object.values(map)) {
      const doc = pickProductionDocument(partition.documents)
      if (!doc) continue
      const tile = mecProcedureTileHtmlFromGpuDocument(doc)
      if (tile) tiles.push(tile)
    }
  }

  const pbd = data.proceduresByDocument ?? {}
  for (const [docName, list] of Object.entries(pbd)) {
    if (!/^MEC_/i.test(docName)) continue
    for (const procedure of list) {
      const title =
        procedure.name?.trim() ||
        procedure.procedureType?.title?.trim() ||
        procedure.documentName?.trim() ||
        'Procédure MEC'
      tiles.push(
        procedureTileHtml({
          title,
          href: documentTileHrefFromApiFields({
            id: procedure.id,
            viewUrl: procedure.files?.[0]?.url,
          }),
          inProgress: procedure.inProgress !== false,
          detailLine: null,
        }),
      )
    }
  }

  if (!tiles.length) return ''
  return documentTilesListHtml(tiles)
}

import type { FicheInfoSelection } from '@/composables/tabPanels'
import { DEFAULT_FICHE_EMPTY } from '@/composables/tabPanels'
import { isGpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import {
  buildParcelDocumentsHtmlFromFiche,
  buildParcelInfosHtmlFromFiche,
  isGpuParcelFichePayload,
  type GpuParcelFichePayload,
} from '@/lib/fiche/parcelFicheFromGpuApi'
import { ficheCatalogVisibilityRevision } from '@/lib/fiche/ficheCatalogVisibilityFilter'
import { sanitizeFicheHtmlForPrint } from '@/lib/map/print/sanitizeFicheHtmlForPrint'

function parcelFichePayloadFromSelection(
  selection: FicheInfoSelection | null,
): GpuParcelFichePayload | null {
  const raw = selection?.raw
  if (!raw || typeof raw !== 'object') return null
  const payload = raw._parcelFiche
  return isGpuParcelFichePayload(payload) ? payload : null
}

function hasActiveMapSelection(selection: FicheInfoSelection | null): boolean {
  if (!selection || selection.loading === 'data') return false
  return Boolean(selection.mapMode || selection.raw)
}

/** Activable dès qu’une fiche est chargée (indépendamment du mode carte affiché). */
export function isParcelFichePrintReady(selection: FicheInfoSelection | null): boolean {
  if (!selection || selection.parcelMissingAtPoint) return false
  return hasActiveMapSelection(selection)
}

export function isTerritoryFichePrintReady(selection: FicheInfoSelection | null): boolean {
  return hasActiveMapSelection(selection)
}

export function buildParcelInfosPrintHtml(
  selection: FicheInfoSelection | null,
  mapZoom: number,
): string {
  void ficheCatalogVisibilityRevision.value
  if (!selection) return ''
  const payload = parcelFichePayloadFromSelection(selection)
  if (payload) {
    return sanitizeFicheHtmlForPrint(buildParcelInfosHtmlFromFiche(payload, mapZoom))
  }
  if (selection.parcelInfosHtml?.trim()) {
    return sanitizeFicheHtmlForPrint(selection.parcelInfosHtml)
  }
  return '<p>Aucune information.</p>'
}

export function buildParcelDocumentsPrintHtml(selection: FicheInfoSelection | null): string {
  void ficheCatalogVisibilityRevision.value
  if (!selection) return ''
  const payload = parcelFichePayloadFromSelection(selection)
  if (payload) {
    const raw = selection?.raw
    const ficheApi = raw && typeof raw === 'object' && isGpuFicheInfoPayload(raw) ? raw : null
    return sanitizeFicheHtmlForPrint(buildParcelDocumentsHtmlFromFiche(payload, ficheApi))
  }
  const docs = selection.parcelDocumentsHtml ?? ''
  return docs ? sanitizeFicheHtmlForPrint(docs) : ''
}

export function sanitizeTerritoryTabHtmlForPrint(html: string): string {
  return sanitizeFicheHtmlForPrint(html)
}

export function territoryPrintTitle(selection: FicheInfoSelection | null): string {
  return selection?.territoryTitle ?? selection?.title ?? 'Territoire'
}

export function parcelPrintTitle(selection: FicheInfoSelection | null): string {
  return selection?.parcelLabel ?? selection?.title ?? 'Parcelle'
}

export function territoryEmptyFallbackHtml(): string {
  return DEFAULT_FICHE_EMPTY.bodyHtml ?? '<p>Aucune donnée territoire.</p>'
}

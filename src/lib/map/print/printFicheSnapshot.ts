import type { FicheInfoSelection } from '@/composables/tabPanels'
import { DEFAULT_FICHE_EMPTY } from '@/composables/tabPanels'
import { ficheHasParcelAtPoint, ficheHasTerritoryAtPoint } from '@/lib/fiche/ficheAvailability'
import {
  ficheSelectionFromGpuApi,
  isGpuFicheInfoPayload,
  type GpuFicheInfoPayload,
} from '@/lib/fiche/ficheInfoFromGpuApi'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
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

function gpuPointFromRaw(raw: Record<string, unknown>): { lon: number; lat: number } | null {
  const lon = raw.lon
  const lat = raw.lat
  if (typeof lon === 'number' && typeof lat === 'number') return { lon, lat }
  return null
}

function gpuPayloadFromSelection(selection: FicheInfoSelection): GpuFicheInfoPayload | null {
  const raw = selection.raw
  return raw && isGpuFicheInfoPayload(raw) ? raw : null
}

/** Activable dès que le contenu parcelle est disponible (mode panneau ou cache). */
export function isParcelFichePrintReady(selection: FicheInfoSelection | null): boolean {
  if (!selection || selection.loading === 'data' || selection.parcelMissingAtPoint) return false
  if (selection.cadastreReferences) return true
  if (selection.parcelInfosHtml?.trim() || selection.parcelDocumentsHtml?.trim()) return true
  if (parcelFichePayloadFromSelection(selection)) return true
  const payload = gpuPayloadFromSelection(selection)
  if (payload && ficheHasParcelAtPoint(payload)) return true
  return selection.mapMode === MAP_MODE_PARCEL && Boolean(selection.raw)
}

export function isTerritoryFichePrintReady(selection: FicheInfoSelection | null): boolean {
  if (!selection || selection.loading === 'data') return false
  if ((selection.documentTabs?.length ?? 0) > 0) return true
  if (selection.bodyHtml?.trim()) return true
  const payload = gpuPayloadFromSelection(selection)
  if (payload && ficheHasTerritoryAtPoint(payload)) return true
  return selection.mapMode === MAP_MODE_TERRITORY && Boolean(selection.raw)
}

/**
 * Adapte une sélection (panneau ou cache) au mode d’impression demandé
 * (ex. fiche territoire reconstruite depuis le JSON quand le panneau est en mode parcelle).
 */
export function normalizeFicheSelectionForPrint(
  selection: FicheInfoSelection | null,
  mode: MapModeId,
): FicheInfoSelection | null {
  if (!selection) return null
  if (mode === MAP_MODE_PARCEL && isParcelFichePrintReady(selection)) {
    if (
      selection.mapMode === MAP_MODE_PARCEL ||
      selection.cadastreReferences ||
      selection.parcelInfosHtml?.trim() ||
      parcelFichePayloadFromSelection(selection)
    ) {
      return selection
    }
    const payload = gpuPayloadFromSelection(selection)
    const point = payload ? gpuPointFromRaw(selection.raw as Record<string, unknown>) : null
    if (payload && point && ficheHasParcelAtPoint(payload)) {
      return ficheSelectionFromGpuApi(payload, MAP_MODE_PARCEL, point.lon, point.lat)
    }
    return selection
  }
  if (mode === MAP_MODE_TERRITORY && isTerritoryFichePrintReady(selection)) {
    if ((selection.documentTabs?.length ?? 0) > 0) return selection
    const payload = gpuPayloadFromSelection(selection)
    const point = payload ? gpuPointFromRaw(selection.raw as Record<string, unknown>) : null
    if (payload && point && ficheHasTerritoryAtPoint(payload)) {
      return ficheSelectionFromGpuApi(payload, MAP_MODE_TERRITORY, point.lon, point.lat)
    }
    return selection
  }
  return null
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

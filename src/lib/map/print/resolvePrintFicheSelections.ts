import type { FicheInfoSelection } from '@/composables/tabPanels'
import {
  getCachedFicheSelectionAtMarker,
  loadFicheForMapPoint,
  loadParcelFicheDetail,
  MAP_MODE_PARCEL,
  MAP_MODE_TERRITORY,
} from '@/lib/fiche/ficheInfoService'
import { getMapPermalinkParams, readMapPermalinkMarker } from '@/lib/map/mapPermalink'

export type PrintFicheSelections = {
  territory: FicheInfoSelection | null
  parcel: FicheInfoSelection | null
}

async function ensureModeSelection(
  mode: typeof MAP_MODE_PARCEL,
  zoom: number,
): Promise<FicheInfoSelection | null> {
  let selection = getCachedFicheSelectionAtMarker(mode)
  if (selection) {
    if (mode === MAP_MODE_PARCEL && !selection.parcelInfosHtml?.trim()) {
      try {
        selection = await loadParcelFicheDetail(selection, { silent: true })
      } catch {
        /* conserve la fiche partielle */
      }
    }
    return selection
  }

  const marker = readMapPermalinkMarker(getMapPermalinkParams())
  if (!marker) return null

  selection = await loadFicheForMapPoint({
    lon: marker.lon,
    lat: marker.lat,
    mode,
    zoom,
    skipLocationMarker: true,
    silent: true,
  })

  if (mode === MAP_MODE_PARCEL && selection && !selection.parcelInfosHtml?.trim()) {
    try {
      selection = await loadParcelFicheDetail(selection, { silent: true })
    } catch {
      /* ignore */
    }
  }

  return selection
}

/** Charge en silence les fiches territoire / parcelle pour l’impression (cache ou API). */
export async function resolvePrintFicheSelections(
  zoom: number,
  needs: { territory: boolean; parcel: boolean },
): Promise<PrintFicheSelections> {
  const [territory, parcel] = await Promise.all([
    needs.territory ? ensureModeSelection(MAP_MODE_TERRITORY, zoom) : Promise.resolve(null),
    needs.parcel ? ensureModeSelection(MAP_MODE_PARCEL, zoom) : Promise.resolve(null),
  ])
  return { territory, parcel }
}

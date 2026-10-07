import type Map from 'ol/Map'
import type { Extent } from 'ol/extent'
import { refreshFicheForMapModeChange } from '@/lib/fiche/ficheInfoService'
import { animateViewFit } from '@/lib/map/animateViewFit'
import { defaultMapViewFitPadding } from '@/lib/map/mapViewFitPadding'
import { MAP_MODE_PARCEL, type MapModeId } from '@/lib/map/mapMode'
import { getMapPermalinkParams, readMapPermalinkMarker } from '@/lib/map/mapPermalink'
import {
  empriseTargetKeyForModeFocus,
  ensureModeEmpriseForMapPointAsync,
  modeEmpriseViewExtent,
  readCherryOrModeEmprisePoint,
  searchEngineLayerHostRef,
} from '@/lib/map/searchResultGraphics'

export type FocusModeEmpriseOptions = {
  /** Évite un second chargement fiche quand `scheduleFicheLoadForCherryWhenReady` tourne déjà. */
  skipFicheRefresh?: boolean
}

/** Parcelle : zoom serré (souvent > 15) ; territoire : plafond type recherche lieu. */
export function maxZoomForModeEmpriseFit(map: Map, mode: MapModeId): number {
  const viewMax = map.getView().getMaxZoom()
  const cap = mode === MAP_MODE_PARCEL ? 19 : 15
  return viewMax != null ? Math.min(viewMax, cap) : cap
}

/** Vol sur l’emprise rouge APICarto du mode (cerise ou emprise déjà affichée). */
function extentFromVisibleModeEmprise(): Extent | null {
  const host = searchEngineLayerHostRef.value
  return host ? modeEmpriseViewExtent(host) : null
}

export async function focusModeEmpriseOnMap(
  map: Map,
  mode: MapModeId,
  options: FocusModeEmpriseOptions = {},
): Promise<void> {
  const marker = readMapPermalinkMarker(getMapPermalinkParams()) ?? readCherryOrModeEmprisePoint()
  let extent = extentFromVisibleModeEmprise()
  if (marker) {
    const key = empriseTargetKeyForModeFocus(marker.lon, marker.lat)
    extent = (await ensureModeEmpriseForMapPointAsync(marker.lon, marker.lat, mode, key)) ?? extent
  }
  if (!extent) return
  const maxZoom = maxZoomForModeEmpriseFit(map, mode)
  requestAnimationFrame(() => {
    animateViewFit(map, extent, {
      padding: defaultMapViewFitPadding(),
      maxZoom,
      size: map.getSize(),
    })
  })
  if (options.skipFicheRefresh) return
  const zoom = map.getView().getZoom() ?? 6
  refreshFicheForMapModeChange(mode, zoom)
}

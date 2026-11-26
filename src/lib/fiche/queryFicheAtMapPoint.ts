import { showMapLocationMarker } from '@/composables/mapLocationMarker'
import { loadFicheForMapPoint } from '@/lib/fiche/ficheInfoService'
import type { MapModeId } from '@/lib/map/mapMode'
import {
  empriseTargetKeyForPoint,
  ensureModeEmpriseForMapPoint,
} from '@/lib/map/searchResultGraphics'

/**
 * Interroge un point comme un clic carte : cerise immédiate, fiche (panneau) en asynchrone,
 * emprise rouge du mode sur la couche recherche.
 */
export function queryFicheAtMapPoint(params: {
  lon: number
  lat: number
  mode: MapModeId
  zoom: number
}): void {
  const { lon, lat, mode, zoom } = params
  const empriseKey = empriseTargetKeyForPoint(lon, lat)
  showMapLocationMarker(lon, lat, { label: '', origin: 'ficheInfo', center: false })
  void loadFicheForMapPoint({ lon, lat, mode, zoom, markerPlacedAtClick: true })
  ensureModeEmpriseForMapPoint(lon, lat, mode, empriseKey)
}

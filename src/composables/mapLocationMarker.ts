import { shallowRef } from 'vue'

export type MapLocationMarkerOptions = {
  /** Contenu HTML popup geopf (cerise). */
  label?: string
  /** Centre la vue sur le point (défaut : false pour ne pas perturber le zoom au clic info). */
  center?: boolean
  origin?: string
}

export type MapLocationMarkerFn = (
  lon: number,
  lat: number,
  options?: MapLocationMarkerOptions,
) => void

/** Cerise geopf — enregistrée par `SearchEngineControl`. */
export const mapLocationMarkerRef = shallowRef<MapLocationMarkerFn | null>(null)

export function setMapLocationMarker(fn: MapLocationMarkerFn | null): void {
  mapLocationMarkerRef.value = fn
}

export function showMapLocationMarker(
  lon: number,
  lat: number,
  options?: MapLocationMarkerOptions,
): void {
  mapLocationMarkerRef.value?.(lon, lat, options)
}

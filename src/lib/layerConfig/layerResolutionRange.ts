import type View from 'ol/View'

/** Aligné gpu-client `layerResolutionRange.js` (RESOLUTION_EPSILON). */
const RESOLUTION_EPSILON = 0.00001

/**
 * Plage de zoom configurée → bornes de résolution OpenLayers
 * (tuile masquée si `resolution >= maxResolution` ou `resolution < minResolution`).
 */
export function getLayerResolutionRange(
  view: View,
  minZoomLevel: number,
  maxZoomLevel: number,
): { minResolution: number; maxResolution: number } {
  const viewMinZoom = view.getMinZoom()

  let maxResolution: number
  if (minZoomLevel - 1 >= viewMinZoom) {
    maxResolution = view.getResolutionForZoom(minZoomLevel - 1)
  } else {
    maxResolution = view.getResolutionForZoom(minZoomLevel) + RESOLUTION_EPSILON
  }

  return {
    minResolution: view.getResolutionForZoom(maxZoomLevel),
    maxResolution,
  }
}

/** Couche visible à ce zoom (même règle que `gpuWmsLayers`). */
export function isZoomInLayerResolutionRange(
  view: View,
  zoom: number,
  minZoomLevel: number,
  maxZoomLevel: number,
): boolean {
  const resolution = view.getResolutionForZoom(zoom)
  const range = getLayerResolutionRange(view, minZoomLevel, maxZoomLevel)
  return resolution >= range.minResolution && resolution < range.maxResolution
}

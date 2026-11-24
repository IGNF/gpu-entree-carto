import type Feature from 'ol/Feature'
import type OlMap from 'ol/Map'
import type { Coordinate } from 'ol/coordinate'
import { createEmpty, extend, isEmpty } from 'ol/extent'
import VectorLayer from 'ol/layer/Vector'
import Point from 'ol/geom/Point'
import { PRINT_SEARCH_LAYER_PROP } from '@/lib/map/print/cloneMapLayers'
import { MODE_EMPRISE_PROP } from '@/lib/map/searchResultGraphics'

const FIT_PADDING_PX = 24

function searchLayerFeatures(map: OlMap): Feature[] {
  const layer = map
    .getLayers()
    .getArray()
    .find((l) => l.get(PRINT_SEARCH_LAYER_PROP))
  return layer instanceof VectorLayer ? (layer.getSource()?.getFeatures() ?? []) : []
}

/**
 * Recentre l’aperçu sur l’emprise rouge pointillé si elle existe, sinon sur la cerise
 * (même zoom). `markerFallback` : position de la cerise (projection de la vue) si absente de l’aperçu.
 * @returns false si aucun lieu n’est connu.
 */
export function recenterPrintPreviewOnPlace(
  map: OlMap,
  markerFallback: Coordinate | null,
): boolean {
  const view = map.getView()
  const features = searchLayerFeatures(map)

  const empriseExtent = createEmpty()
  for (const feature of features) {
    const geometry = feature.getGeometry()
    if (feature.get(MODE_EMPRISE_PROP) && geometry) extend(empriseExtent, geometry.getExtent())
  }
  if (!isEmpty(empriseExtent)) {
    view.fit(empriseExtent, {
      size: map.getSize(),
      padding: [FIT_PADDING_PX, FIT_PADDING_PX, FIT_PADDING_PX, FIT_PADDING_PX],
    })
    return true
  }

  const pin = features.map((f) => f.getGeometry()).find((g): g is Point => g instanceof Point)
  const center = pin?.getCoordinates() ?? markerFallback
  if (!center) return false
  view.setCenter(center)
  return true
}

import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorTile from 'ol/layer/VectorTile'
import type BaseLayer from 'ol/layer/Base'
import Layer from 'ol/layer/Layer'
import type Map from 'ol/Map'
import VectorSource from 'ol/source/Vector'
import type TileSource from 'ol/source/Tile'
import TileWMS, { type Options as TileWMSOptions } from 'ol/source/TileWMS'
import { geopfWmtsPrintSource } from '@/ol/createGeopfWmtsSource'
import { GPU_WMS_SOURCE_OPTIONS_PROP } from '@/lib/layerConfig/gpuWmsLayers'
import { copyViewState } from '@/lib/map/print/syncPrintMapView'
import { renderSyncIfAttached } from '@/lib/map/print/waitForMapRender'
import { searchEngineLayerHostRef } from '@/lib/map/searchResultGraphics'

/** Au-dessus de toutes les couches, comme une couche « non gérée » OpenLayers. */
const SEARCH_LAYER_PRINT_Z_INDEX = 1_000_000

/** Marque la copie de la couche recherche (cerise + emprises) dans l’aperçu. */
export const PRINT_SEARCH_LAYER_PROP = 'ec-print-search-layer'

/**
 * Source de la copie d'impression :
 * - WMS GPU (hidpi désactivé sur la carte) : redessiné net au pixelRatio de l'export ;
 * - fonds WMTS Géoplateforme : grille 512 px, libellés lisibles une fois imprimés.
 */
function printTileSource(layer: TileLayer): TileSource | undefined {
  const gpuWmsOptions = layer.get(GPU_WMS_SOURCE_OPTIONS_PROP) as TileWMSOptions | undefined
  if (gpuWmsOptions) return new TileWMS({ ...gpuWmsOptions, hidpi: true })
  const source = layer.getSource()
  return geopfWmtsPrintSource(source) ?? source ?? undefined
}

function cloneTileLayer(layer: TileLayer): TileLayer {
  return new TileLayer({
    source: printTileSource(layer),
    visible: layer.getVisible(),
    opacity: layer.getOpacity(),
    zIndex: layer.getZIndex(),
    minResolution: layer.getMinResolution(),
    maxResolution: layer.getMaxResolution(),
    className: layer.getClassName(),
  })
}

function cloneVectorTileLayer(layer: VectorTile): VectorTile {
  return new VectorTile({
    source: layer.getSource() ?? undefined,
    style: layer.getStyle(),
    visible: layer.getVisible(),
    opacity: layer.getOpacity(),
    zIndex: layer.getZIndex(),
    minResolution: layer.getMinResolution(),
    maxResolution: layer.getMaxResolution(),
    declutter: layer.getDeclutter?.(),
    renderMode: layer.getRenderMode?.(),
  })
}

function cloneVectorLayer(layer: VectorLayer): VectorLayer {
  const source = layer.getSource()
  const clonedFeatures = source?.getFeatures().map((f) => f.clone()) ?? []
  return new VectorLayer({
    source: new VectorSource({ features: clonedFeatures }),
    style: layer.getStyle(),
    visible: layer.getVisible(),
    opacity: layer.getOpacity(),
    zIndex: layer.getZIndex(),
    minResolution: layer.getMinResolution(),
    maxResolution: layer.getMaxResolution(),
  })
}

export function cloneLayerForPrint(layer: BaseLayer): Layer | null {
  if (!(layer instanceof Layer)) return null
  if (layer instanceof VectorTile) return cloneVectorTileLayer(layer)
  if (layer instanceof VectorLayer) return cloneVectorLayer(layer)
  if (layer instanceof TileLayer) return cloneTileLayer(layer)
  return null
}

/** Couches visibles uniquement, ordre identique à la carte source. */
export function copyVisibleMapLayers(sourceLayers: BaseLayer[], targetMap: Map): void {
  for (const layer of sourceLayers) {
    if (!layer.getVisible()) continue
    const cloned = cloneLayerForPrint(layer)
    if (cloned) targetMap.addLayer(cloned)
  }
}

export function rebuildPrintPreviewMap(
  sourceMap: Map,
  targetMap: Map,
  options: { syncViewFromSource?: boolean } = {},
): void {
  targetMap.getLayers().clear()
  copyVisibleMapLayers(sourceMap.getLayers().getArray(), targetMap)
  // Cerise + emprises (pointillés rouges) : couche geopf attachée par setMap(), hors getLayers().
  const host = searchEngineLayerHostRef.value
  const searchLayer = host?.getMap() === sourceMap ? (host.layer as BaseLayer | undefined) : null
  const searchClone = searchLayer?.getVisible() ? cloneLayerForPrint(searchLayer) : null
  if (searchClone) {
    searchClone.setZIndex(SEARCH_LAYER_PRINT_Z_INDEX)
    searchClone.set(PRINT_SEARCH_LAYER_PROP, true)
    targetMap.addLayer(searchClone)
  }
  if (options.syncViewFromSource !== false) {
    copyViewState(sourceMap.getView(), targetMap.getView())
  }
  renderSyncIfAttached(targetMap)
}

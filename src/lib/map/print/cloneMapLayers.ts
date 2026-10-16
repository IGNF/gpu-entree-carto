import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorTile from 'ol/layer/VectorTile'
import type BaseLayer from 'ol/layer/Base'
import Layer from 'ol/layer/Layer'
import type Map from 'ol/Map'
import VectorSource from 'ol/source/Vector'
import { copyViewState } from '@/lib/map/print/syncPrintMapView'

function cloneTileLayer(layer: TileLayer): TileLayer {
  return new TileLayer({
    source: layer.getSource() ?? undefined,
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

export function rebuildPrintPreviewMap(sourceMap: Map, targetMap: Map): void {
  targetMap.getLayers().clear()
  copyVisibleMapLayers(sourceMap.getLayers().getArray(), targetMap)
  copyViewState(sourceMap.getView(), targetMap.getView())
  targetMap.renderSync()
}

import type OlMap from 'ol/Map'
import { listInitiallyVisibleStackableIds } from '@/lib/layerConfig/catalogLayerTargets'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import { flattenTreeLayerNodes } from '@/lib/layerConfig/layerConfigToTree'
import { gpuWmsLayerRegistry } from '@/lib/layerConfig/gpuWmsLayers'

/** Affiche sur la carte les feuilles WMS marquées `visible` dans LAYER_CONFIG. */
export function applyVisibleStackableLayersToRegistry(nodes: TreeLayerNode[]): void {
  const byId = new Map(flattenTreeLayerNodes(nodes).map((n) => [n.id, n]))
  for (const id of listInitiallyVisibleStackableIds(nodes)) {
    const node = byId.get(id)
    if (!node?.gpuMapLayer) continue
    gpuWmsLayerRegistry.setVisible(id, true)
    gpuWmsLayerRegistry.setOpacity(id, node.gpuDefaultOpacity ?? 70)
  }
}

export function attachMapAndSyncVisibleGpuWms(map: OlMap | null, nodes: TreeLayerNode[]): void {
  if (!map) return
  gpuWmsLayerRegistry.attachMap(map)
  applyVisibleStackableLayersToRegistry(nodes)
}

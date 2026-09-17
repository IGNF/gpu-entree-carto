import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import type { GpuLayerConfig } from '@/lib/layerConfig/gpuLayerConfig'
import { isCatalogAggregate } from '@/lib/layerConfig/catalogCheckboxLogic'
import { catalogChildNodes } from '@/lib/layerConfig/catalogLayerTargets'

/** Aligné `gpuWmsLayers` / gpu.model.Layer (racine). */
export const DEFAULT_GPU_MIN_ZOOM = 0
export const DEFAULT_GPU_MAX_ZOOM = 22

export function isZoomInLayerRange(zoom: number, minZoom: number, maxZoom: number): boolean {
  return zoom >= minZoom && zoom <= maxZoom
}

export function effectiveZoomLevelsFromConfig(
  layer: GpuLayerConfig,
  inheritedMin: number,
  inheritedMax: number,
): { min: number; max: number } {
  return {
    min: layer.minZoomLevel ?? inheritedMin,
    max: layer.maxZoomLevel ?? inheritedMax,
  }
}

/**
 * Grisage catalogue / panneaux — gpu-client `TreeLayerSwitcherItem#oneLayerIsInRange` :
 * tuile WMS (agrégat ou feuille) → plage propre ; groupe sans tuile → un enfant dans la plage.
 */
export function isCatalogNodeInZoomRange(node: TreeLayerNode, zoom: number): boolean {
  const min = node.gpuMinZoomLevel ?? DEFAULT_GPU_MIN_ZOOM
  const max = node.gpuMaxZoomLevel ?? DEFAULT_GPU_MAX_ZOOM
  const children = catalogChildNodes(node)

  if (node.gpuMapLayer && (isCatalogAggregate(node) || node.gpuOnlyLegend || children.length === 0)) {
    return isZoomInLayerRange(zoom, min, max)
  }

  if (!children.length) return true

  return children.some((child) => isCatalogNodeInZoomRange(child, zoom))
}

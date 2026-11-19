import type { TreeLayerNode } from '@/types/treeLayerNode'
import type { GpuLayerConfig } from '@/lib/layerConfig/gpuLayerConfig'
import { isCatalogAggregate } from '@/lib/layerConfig/catalogCheckboxLogic'
import { catalogChildNodes } from '@/lib/layerConfig/catalogLayerTargets'

/** Aligné `gpuWmsLayers` / gpu.model.Layer (racine). */
export const DEFAULT_GPU_MIN_ZOOM = 0
export const DEFAULT_GPU_MAX_ZOOM = 22

/**
 * Marge historique entree-carto sur les tuiles WMS (voir `getLayerResolutionRange` pour l’alignement gpu-client).
 * Conservée pour la bascule picto quand le seuil catalogue vaut 16 (tuile détail minZoom 16).
 */
export const GPU_WMS_ZOOM_BAND_MARGIN = 0.5

/** Seuil gpu-client / LAYER_CONFIG par défaut pour `scaleDependant`. */
export const DEFAULT_SCALE_DEPENDANT_LEGEND_THRESHOLD = 16

/**
 * Certaines configs mélangent `scaleDependantTreshold` et la visibilité LEGEND_CONFIG (`highscale: [17,…]`).
 * Les pictos catalogue DU suivent la bande tuile WMS (~16), pas le seuil 17 des fiches parcelle.
 */
export function effectiveScaleDependantLegendThreshold(threshold: number): number {
  if (!Number.isFinite(threshold)) return DEFAULT_SCALE_DEPENDANT_LEGEND_THRESHOLD
  if (threshold >= 17) return DEFAULT_SCALE_DEPENDANT_LEGEND_THRESHOLD
  return threshold
}

/** Bascule highscale légende : alignée visibilité tuile détail (minZoom 16 → dès ~15,5). */
export function isHighScaleLegendZoom(zoom: number, threshold: number): boolean {
  const t = effectiveScaleDependantLegendThreshold(threshold)
  return zoom >= t - GPU_WMS_ZOOM_BAND_MARGIN
}

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

  if (
    node.gpuMapLayer &&
    (isCatalogAggregate(node) || node.gpuOnlyLegend || children.length === 0)
  ) {
    return isZoomInLayerRange(zoom, min, max)
  }

  if (!children.length) return true

  return children.some((child) => isCatalogNodeInZoomRange(child, zoom))
}

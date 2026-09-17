import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import {
  layerConfigToCatalogEntries,
  pathToCatalogId,
  buildLayerPath,
  resolveGpuLayerVisible,
  type GpuLayerConfig,
} from '@/lib/layerConfig/gpuLayerConfig'
import {
  buildLegendItemsForGpuLayer,
  readGpuLegendBuildOptions,
  type GpuLegendBuildOptions,
} from '@/lib/layerConfig/gpuLegendItems'
import { GPU_FORCE_OPACITY_PERCENT } from '@/lib/layerConfig/catalogLayerTargets'

function defaultOpacityPercent(layer: GpuLayerConfig): number {
  if (layer.forceOpacity) return GPU_FORCE_OPACITY_PERCENT
  if (typeof layer.opacity === 'number' && Number.isFinite(layer.opacity)) {
    return Math.round(layer.opacity * 100)
  }
  return 70
}

/** Tuile WMS si `name` et non virtual (onlyLegend inclus — gpu-client CreateTreeLayerSwitcherItems). */
function isGpuMapLayerConfig(layer: GpuLayerConfig): boolean {
  return !layer.virtual && Boolean(layer.name?.trim())
}

function buildTreeLevel(
  layers: GpuLayerConfig[],
  parentPath: string,
  ancestorLayers: GpuLayerConfig[],
  legendOpts: GpuLegendBuildOptions,
  parentVisible = false,
  /** gpu-client `isLayerConfigHasLegend` : pas de légende sur les enfants d’un parent hideLayers. */
  underHideLayersParent = false,
): TreeLayerNode[] {
  const nodes: TreeLayerNode[] = []

  for (const layer of layers) {
    if (layer.hideHimself) {
      if (layer.layers?.length) {
        nodes.push(
          ...buildTreeLevel(
            layer.layers,
            parentPath,
            ancestorLayers,
            legendOpts,
            parentVisible,
            underHideLayersParent,
          ),
        )
      }
      continue
    }

    const visible = resolveGpuLayerVisible(layer, parentVisible)
    const path = buildLayerPath(layer, parentPath || '')
    const id = pathToCatalogId(path)

    const legendContext: GpuLegendBuildOptions = {
      ...legendOpts,
      ancestorLayers: [...ancestorLayers],
    }
    const legend = underHideLayersParent
      ? []
      : buildLegendItemsForGpuLayer(layer, legendContext)

    const node: TreeLayerNode = {
      id,
      title: layer.title?.trim() || layer.name || id,
      visible,
      defaultCollapsed: Boolean(layer.hideLayers),
      gpuHideLayers: Boolean(layer.hideLayers),
      gpuVirtual: Boolean(layer.virtual),
      gpuMapLayer: isGpuMapLayerConfig(layer),
      gpuOnlyLegend: Boolean(layer.onlyLegend),
      gpuForceOpacity: Boolean(layer.forceOpacity),
      gpuDefaultOpacity: defaultOpacityPercent(layer),
      legend: legend.length ? legend : undefined,
    }

    if (layer.layers?.length) {
      const childNodes = buildTreeLevel(
        layer.layers,
        path,
        [...ancestorLayers, layer],
        legendOpts,
        visible,
        underHideLayersParent || Boolean(layer.hideLayers),
      )
      if (layer.hideLayers) {
        node.hiddenCatalogChildren = childNodes
      } else {
        node.children = childNodes
      }
    }

    nodes.push(node)
  }

  return nodes
}

export function layerConfigToTreeNodes(
  layers: GpuLayerConfig[],
  zoomAtInit = 6,
): TreeLayerNode[] {
  const legendOpts = readGpuLegendBuildOptions(zoomAtInit)
  return buildTreeLevel(layers, '', [], legendOpts)
}

export function flattenTreeLayerNodes(nodes: TreeLayerNode[]): TreeLayerNode[] {
  const flat: TreeLayerNode[] = []
  function walk(list: TreeLayerNode[]) {
    for (const node of list) {
      flat.push(node)
      if (node.children?.length) walk(node.children)
      if (node.hiddenCatalogChildren?.length) walk(node.hiddenCatalogChildren)
    }
  }
  walk(nodes)
  return flat
}

export { layerConfigToCatalogEntries, pathToCatalogId }

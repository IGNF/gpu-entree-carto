import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import {
  layerConfigToCatalogEntries,
  pathToCatalogId,
  pathSegment,
  type GpuLayerConfig,
} from '@/lib/layerConfig/gpuLayerConfig'

function buildTreeLevel(
  layers: GpuLayerConfig[],
  parentPath: string,
): TreeLayerNode[] {
  const nodes: TreeLayerNode[] = []

  for (const layer of layers) {
    if (layer.hideHimself) {
      if (layer.layers?.length) {
        nodes.push(...buildTreeLevel(layer.layers, parentPath))
      }
      continue
    }

    const segment = pathSegment(layer)
    const path = layer.path?.startsWith('/')
      ? layer.path
      : `${parentPath}/${segment}`.replace(/\/+/g, '/')
    const id = pathToCatalogId(path)

    const node: TreeLayerNode = {
      id,
      title: layer.title?.trim() || layer.name || id,
      visible: Boolean(layer.visible),
      defaultCollapsed: Boolean(layer.hideLayers),
      gpuVirtual: Boolean(layer.virtual),
    }

    if (layer.layers?.length) {
      node.children = buildTreeLevel(layer.layers, path)
    }

    nodes.push(node)
  }

  return nodes
}

export function layerConfigToTreeNodes(layers: GpuLayerConfig[]): TreeLayerNode[] {
  return buildTreeLevel(layers, '')
}

export function flattenTreeLayerNodes(nodes: TreeLayerNode[]): TreeLayerNode[] {
  const flat: TreeLayerNode[] = []
  function walk(list: TreeLayerNode[]) {
    for (const node of list) {
      flat.push(node)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(nodes)
  return flat
}

export { layerConfigToCatalogEntries, pathToCatalogId }

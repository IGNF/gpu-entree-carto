import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import { catalogChildNodes } from '@/lib/layerConfig/catalogLayerTargets'

export interface CatalogTreeIndex {
  nodesById: Map<string, TreeLayerNode>
  parentById: Map<string, TreeLayerNode | null>
  roots: TreeLayerNode[]
}

export function buildCatalogTreeIndex(roots: TreeLayerNode[]): CatalogTreeIndex {
  const nodesById = new Map<string, TreeLayerNode>()
  const parentById = new Map<string, TreeLayerNode | null>()

  function walk(node: TreeLayerNode, parent: TreeLayerNode | null) {
    nodesById.set(node.id, node)
    parentById.set(node.id, parent)
    for (const child of catalogChildNodes(node)) {
      walk(child, node)
    }
  }

  for (const root of roots) walk(root, null)

  return { nodesById, parentById, roots }
}

export function flattenCatalogNodes(roots: TreeLayerNode[]): TreeLayerNode[] {
  const flat: TreeLayerNode[] = []
  function walk(node: TreeLayerNode) {
    flat.push(node)
    catalogChildNodes(node).forEach(walk)
  }
  roots.forEach(walk)
  return flat
}

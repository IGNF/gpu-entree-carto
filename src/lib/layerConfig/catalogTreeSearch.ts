import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import { catalogSwitcherDisplayNodes } from '@/lib/layerConfig/catalogLayerTargets'

/** Entrées visibles dans le sélecteur catalogue (sans `onlyLegend`). */
export function flattenCatalogSwitcherNodes(roots: TreeLayerNode[]): TreeLayerNode[] {
  const out: TreeLayerNode[] = []

  function walkLevel(nodes: TreeLayerNode[]) {
    for (const node of catalogSwitcherDisplayNodes(nodes)) {
      out.push(node)
      if (node.children?.length) walkLevel(node.children)
    }
  }

  walkLevel(roots)
  return out
}

export function normalizeCatalogSearchQuery(raw: string): string {
  return raw.trim().toLocaleLowerCase('fr')
}

export function catalogNodesMatchingSearch(
  roots: TreeLayerNode[],
  query: string,
): TreeLayerNode[] {
  const q = normalizeCatalogSearchQuery(query)
  if (!q) return []
  return flattenCatalogSwitcherNodes(roots).filter((node) =>
    node.title.toLocaleLowerCase('fr').includes(q),
  )
}

export function catalogDomIdFromNodeId(nodeId: string): string {
  return nodeId.replace(/[^a-zA-Z0-9_-]/g, '_')
}

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

/** Chaîne parent → racine (ids des ancêtres à déplier pour afficher `nodeId`). */
export function catalogAncestorIds(
  nodeId: string,
  parentById: Map<string, TreeLayerNode | null>,
): string[] {
  const ids: string[] = []
  let parent = parentById.get(nodeId) ?? null
  while (parent) {
    ids.unshift(parent.id)
    parent = parentById.get(parent.id) ?? null
  }
  return ids
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

/** Sous-arbre entièrement coché (nœud + tous les descendants catalogue). */
export function catalogSubtreeFullyChecked(
  node: TreeLayerNode,
  checkedById: Record<string, boolean>,
): boolean {
  if (!checkedById[node.id]) return false
  for (const child of catalogChildNodes(node)) {
    if (!catalogSubtreeFullyChecked(child, checkedById)) return false
  }
  return true
}

/** Au moins une entrée cochée et une décochée dans le sous-arbre (nœud inclus). */
export function catalogSubtreePartiallyChecked(
  node: TreeLayerNode,
  checkedById: Record<string, boolean>,
): boolean {
  let anyChecked = false
  let anyUnchecked = false

  function walk(n: TreeLayerNode) {
    if (checkedById[n.id]) anyChecked = true
    else anyUnchecked = true
    for (const child of catalogChildNodes(n)) walk(child)
  }

  walk(node)
  return anyChecked && anyUnchecked
}

/**
 * Nœuds à déplier : sélection **mixte** dans le sous-arbre seulement
 * (tout coché ou tout décoché → replié ; ex. SUP sans `visible` → replié).
 */
export function catalogAncestorIdsToExpand(
  roots: TreeLayerNode[],
  checkedById: Record<string, boolean>,
): ReadonlySet<string> {
  const expand = new Set<string>()

  function visit(node: TreeLayerNode) {
    const children = catalogChildNodes(node)
    if (!children.length) return

    if (catalogSubtreePartiallyChecked(node, checkedById)) {
      expand.add(node.id)
    }
    for (const child of children) {
      visit(child)
    }
  }

  for (const root of roots) visit(root)
  return expand
}

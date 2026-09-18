import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import { catalogChildNodes } from '@/lib/layerConfig/catalogLayerTargets'
import type { CatalogTreeIndex } from '@/lib/layerConfig/catalogTreeIndex'

/** Agrégat WMS : couche parent + sous-arbre (non virtual). */
export function isCatalogAggregate(node: TreeLayerNode): boolean {
  return Boolean(node.gpuMapLayer && !node.gpuVirtual && catalogChildNodes(node).length > 0)
}

function directCatalogChildren(node: TreeLayerNode): TreeLayerNode[] {
  return catalogChildNodes(node)
}

export function isCheckboxSameAsDirectChildren(
  checked: Record<string, boolean>,
  node: TreeLayerNode,
): boolean {
  const self = Boolean(checked[node.id])
  for (const child of directCatalogChildren(node)) {
    if (Boolean(checked[child.id]) !== self) return false
  }
  return true
}

export function isSameAsChildrenState(
  checked: Record<string, boolean>,
  node: TreeLayerNode,
  opacityById: Record<string, number>,
): boolean {
  if (!isCheckboxSameAsDirectChildren(checked, node)) return false
  return isOpacitySameAsDirectChildren(node, opacityById)
}

export function isSameAsDescendants(
  checked: Record<string, boolean>,
  node: TreeLayerNode,
  index: CatalogTreeIndex,
  opacityById: Record<string, number>,
): boolean {
  if (!isSameAsChildrenState(checked, node, opacityById)) return false
  for (const child of directCatalogChildren(node)) {
    if (!isSameAsDescendants(checked, child, index, opacityById)) return false
  }
  return true
}

export type MapVisibilityComputeOptions = {
  /** Agrégats affichés en tuiles séparées dans Couches de données (pas de tuile parent). */
  splitAggregateIds?: ReadonlySet<string>
}

export function isAscendentParentAggregateActive(
  checked: Record<string, boolean>,
  node: TreeLayerNode,
  index: CatalogTreeIndex,
  opacityById: Record<string, number>,
  options?: MapVisibilityComputeOptions,
): boolean {
  const split = options?.splitAggregateIds
  const parent = index.parentById.get(node.id)
  if (!parent) return false
  if (split?.has(parent.id)) {
    return isAscendentParentAggregateActive(checked, parent, index, opacityById, options)
  }
  if (
    isCatalogAggregate(parent) &&
    isSameAsDescendants(checked, parent, index, opacityById)
  ) {
    return true
  }
  return isAscendentParentAggregateActive(checked, parent, index, opacityById, options)
}

function isOpacitySameAsDirectChildren(
  node: TreeLayerNode,
  opacityById: Record<string, number>,
): boolean {
  const selfOpacity = opacityById[node.id] ?? node.gpuDefaultOpacity ?? 70
  for (const child of directCatalogChildren(node)) {
    const childOpacity = opacityById[child.id] ?? child.gpuDefaultOpacity ?? 70
    if (childOpacity !== selfOpacity) return false
  }
  return true
}

export function shouldShowMapLayerForNode(
  checked: Record<string, boolean>,
  node: TreeLayerNode,
  index: CatalogTreeIndex,
  opacityById: Record<string, number>,
  options?: MapVisibilityComputeOptions,
): boolean {
  if (!node.gpuMapLayer || node.gpuVirtual) return false
  if (!Boolean(checked[node.id])) return false

  const split = options?.splitAggregateIds
  if (
    split?.has(node.id) &&
    isCatalogAggregate(node) &&
    isSameAsDescendants(checked, node, index, opacityById)
  ) {
    return false
  }

  const parent = index.parentById.get(node.id)
  if (!parent) {
    if (isSameAsDescendants(checked, node, index, opacityById)) return true
    return catalogChildNodes(node).length === 0
  }

  if (
    isSameAsDescendants(checked, node, index, opacityById) &&
    !isAscendentParentAggregateActive(checked, node, index, opacityById, options)
  ) {
    return true
  }

  return false
}

/** gpu-client setChildrenCheckboxes */
export function propagateCheckedToDescendants(
  checked: Record<string, boolean>,
  node: TreeLayerNode,
  value: boolean,
  _index?: CatalogTreeIndex,
): void {
  for (const child of directCatalogChildren(node)) {
    checked[child.id] = value
    propagateCheckedToDescendants(checked, child, value)
  }
}

/** gpu-client setParentCheckbox (OR sur enfants, hors onlyLegend) */
export function propagateCheckedToAncestors(
  checked: Record<string, boolean>,
  nodeId: string,
  index: CatalogTreeIndex,
): void {
  const parent = index.parentById.get(nodeId)
  if (!parent) return

  let parentChecked = false
  for (const child of directCatalogChildren(parent)) {
    if (child.gpuOnlyLegend) continue
    if (Boolean(checked[child.id])) {
      parentChecked = true
      break
    }
  }

  for (const child of directCatalogChildren(parent)) {
    if (child.gpuOnlyLegend && Boolean(checked[child.id]) !== parentChecked) {
      checked[child.id] = parentChecked
    }
  }

  if (Boolean(checked[parent.id]) !== parentChecked) {
    checked[parent.id] = parentChecked
  }

  propagateCheckedToAncestors(checked, parent.id, index)
}

/**
 * Clic utilisateur sur une checkbox (gpu-client `setActive`).
 * Ordre : état local → parents → descendants.
 */
export function applyUserCatalogToggle(
  checked: Record<string, boolean>,
  nodeId: string,
  value: boolean,
  index: CatalogTreeIndex,
): void {
  const node = index.nodesById.get(nodeId)
  if (!node) return

  checked[nodeId] = value
  propagateCheckedToAncestors(checked, nodeId, index)
  propagateCheckedToDescendants(checked, node, value, index)
}

export function computeMapVisibilityById(
  checked: Record<string, boolean>,
  index: CatalogTreeIndex,
  opacityById: Record<string, number>,
  options?: MapVisibilityComputeOptions,
): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const node of index.nodesById.values()) {
    if (!node.gpuMapLayer) continue
    out[node.id] = shouldShowMapLayerForNode(checked, node, index, opacityById, options)
  }
  return out
}

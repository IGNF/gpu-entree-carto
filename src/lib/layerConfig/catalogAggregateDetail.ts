import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import { isCatalogAggregate, type MapVisibilityComputeOptions } from '@/lib/layerConfig/catalogCheckboxLogic'
import { catalogChildNodes } from '@/lib/layerConfig/catalogLayerTargets'
import type { CatalogTreeIndex } from '@/lib/layerConfig/catalogTreeIndex'
import type { PanelLayerState } from '@/lib/layerConfig/catalogDataLayersStack'

export type AggregateDetailToggle = {
  aggregateId: string
}

export type AggregateRegroupControl = {
  aggregateId: string
}

/** Retire les ids invalides (agrégat décoché) — le détail reste même si les opacités divergent. */
export function pruneSplitAggregateIds(
  splitIds: ReadonlySet<string>,
  checked: Record<string, boolean>,
  index: CatalogTreeIndex,
): Set<string> {
  const next = new Set<string>()
  for (const id of splitIds) {
    const node = index.nodesById.get(id)
    if (!node || !isCatalogAggregate(node)) continue
    if (!checked[id]) continue
    next.add(id)
  }
  return next
}

export function mapVisibilityOptionsFromSplitIds(
  splitIds: ReadonlySet<string>,
): MapVisibilityComputeOptions | undefined {
  return splitIds.size ? { splitAggregateIds: splitIds } : undefined
}

/** Bouton « Détailler » sur l’agrégat tant qu’il n’est pas en mode détaillé. */
export function aggregateDetailToggleForStackNode(
  node: TreeLayerNode,
  splitIds: ReadonlySet<string>,
): AggregateDetailToggle | null {
  if (isCatalogAggregate(node) && !splitIds.has(node.id)) {
    return { aggregateId: node.id }
  }
  return null
}

/** Bouton « Regrouper » sur chaque enfant direct lorsque le parent est détaillé. */
export function aggregateRegroupForStackNode(
  node: TreeLayerNode,
  splitIds: ReadonlySet<string>,
  index: CatalogTreeIndex,
): AggregateRegroupControl | null {
  const parent = index.parentById.get(node.id)
  if (!parent || !splitIds.has(parent.id)) return null
  const isDirectChild = catalogChildNodes(parent).some((c) => c.id === node.id)
  if (!isDirectChild) return null
  return { aggregateId: parent.id }
}

/** Propage opacité / visibilité / grisé du parent vers les enfants directs (mode détaillé). */
export function syncDirectChildrenPanelStateFromAggregate(
  aggregate: TreeLayerNode,
  state: PanelLayerState,
  patch: (id: string, partial: Partial<PanelLayerState>) => void,
): void {
  for (const child of catalogChildNodes(aggregate)) {
    if (child.gpuForceOpacity) continue
    patch(child.id, state)
  }
}

/** État agrégat après regroupement à partir des enfants directs. */
export function aggregatePanelStateAfterRegroup(
  _aggregate: TreeLayerNode,
  savedAggregateState: PanelLayerState,
  childStates: PanelLayerState[],
): PanelLayerState {
  const visible =
    childStates.length > 0 && childStates.some((s) => s.visible)
  const grayscale =
    childStates.length > 0 && childStates.every((s) => s.grayscale)
  return {
    opacity: savedAggregateState.opacity,
    visible,
    grayscale,
  }
}

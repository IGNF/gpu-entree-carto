import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import type { LegendItem } from '@/types/stubs'
import { dedupeLegendItems } from '@/lib/layerConfig/gpuLegendItems'
import { isCatalogAggregate } from '@/lib/layerConfig/catalogCheckboxLogic'
import {
  catalogChildNodes,
  catalogNodeOpacityPercent,
} from '@/lib/layerConfig/catalogLayerTargets'

export type PanelLayerState = {
  visible: boolean
  opacity: number
  grayscale: boolean
}

export function defaultPanelStateForNode(node: TreeLayerNode): PanelLayerState {
  return {
    visible: true,
    opacity: catalogNodeOpacityPercent(node),
    grayscale: false,
  }
}

export function isUnderHideLayersCatalogBranch(
  node: TreeLayerNode,
  parentById: Map<string, TreeLayerNode | null>,
): boolean {
  let parent = parentById.get(node.id) ?? null
  while (parent) {
    if (parent.gpuHideLayers) return true
    parent = parentById.get(parent.id) ?? null
  }
  return false
}

export function isDataLayersPanelEntry(
  node: TreeLayerNode,
  checkedById: Record<string, boolean>,
  parentById?: Map<string, TreeLayerNode | null>,
): boolean {
  if (node.gpuOnlyLegend) return false
  if (!Boolean(checkedById[node.id]) || node.gpuForceOpacity) return false
  if (parentById && isUnderHideLayersCatalogBranch(node, parentById)) return false
  return true
}

/** Un ancêtre agrégat WMS est affiché sur la carte à la place des feuilles. */
export function hasActiveMapAggregateAncestor(
  node: TreeLayerNode,
  parentById: Map<string, TreeLayerNode | null>,
  mapVisibilityById: Record<string, boolean>,
): boolean {
  let parent = parentById.get(node.id) ?? null
  while (parent) {
    if (
      isCatalogAggregate(parent) &&
      parent.gpuMapLayer &&
      Boolean(mapVisibilityById[parent.id])
    ) {
      return true
    }
    parent = parentById.get(parent.id) ?? null
  }
  return false
}

/**
 * Ligne « Couches de données » : cochée dans le catalogue, éligible au panneau,
 * couche réellement active sur la carte (agrégat actif → pas les enfants cochés).
 */
export function shouldShowInDataLayersStack(
  node: TreeLayerNode,
  checkedById: Record<string, boolean>,
  parentById: Map<string, TreeLayerNode | null>,
  mapVisibilityById: Record<string, boolean>,
): boolean {
  if (!isDataLayersPanelEntry(node, checkedById, parentById)) return false

  if (node.gpuMapLayer) {
    if (!mapVisibilityById[node.id]) return false
    return !hasActiveMapAggregateAncestor(node, parentById, mapVisibilityById)
  }

  if (node.gpuHideLayers) {
    return collectWmsMapLayerIdsUnder(node).some((id) => Boolean(mapVisibilityById[id]))
  }

  return false
}

/** Couches `onlyLegend` actives sur la carte — onglet Légendes uniquement (pas Couches de données). */
export function collectActiveOnlyLegendNodesForLegendsPanel(
  roots: TreeLayerNode[],
  checkedById: Record<string, boolean>,
  mapVisibilityById: Record<string, boolean>,
): TreeLayerNode[] {
  const out: TreeLayerNode[] = []

  function walk(nodes: TreeLayerNode[]) {
    for (const node of nodes) {
      if (
        node.gpuOnlyLegend &&
        node.legend?.length &&
        Boolean(checkedById[node.id]) &&
        Boolean(mapVisibilityById[node.id])
      ) {
        out.push(node)
      }
      walk(catalogChildNodes(node))
    }
  }

  walk(roots)
  return out
}

export function collectDataLayersStackNodes(
  roots: TreeLayerNode[],
  checkedById: Record<string, boolean>,
  parentById: Map<string, TreeLayerNode | null>,
  mapVisibilityById: Record<string, boolean>,
): TreeLayerNode[] {
  const out: TreeLayerNode[] = []

  function walk(nodes: TreeLayerNode[]) {
    for (const node of nodes) {
      if (shouldShowInDataLayersStack(node, checkedById, parentById, mapVisibilityById)) {
        out.push(node)
      }
      walk(catalogChildNodes(node))
    }
  }

  walk(roots)
  return out
}

/** WMS pilotés par une ligne du panneau (sans propagation parent/enfant). */
export function wmsIdsControlledByDataLayersPanelEntry(
  node: TreeLayerNode,
  mapVisibilityById: Record<string, boolean>,
): string[] {
  if (node.gpuMapLayer && mapVisibilityById[node.id]) {
    return [node.id]
  }
  return collectWmsMapLayerIdsUnder(node).filter((id) => Boolean(mapVisibilityById[id]))
}

/**
 * Entrées catalogue dont `panelStateById.opacity` doit suivre le curseur panneau.
 * Agrégat actif : tout le sous-arbre (y compris nœuds `virtual` sans tuile WMS),
 * requis par `isSameAsDescendants` gpu-client.
 */
export function catalogIdsForPanelOpacityWhenEntryAdjusted(
  node: TreeLayerNode,
  mapVisibilityById: Record<string, boolean>,
): string[] {
  if (
    isCatalogAggregate(node) &&
    node.gpuMapLayer &&
    mapVisibilityById[node.id]
  ) {
    const ids: string[] = []
    function walk(n: TreeLayerNode) {
      if (n.gpuForceOpacity) {
        catalogChildNodes(n).forEach(walk)
        return
      }
      ids.push(n.id)
      catalogChildNodes(n).forEach(walk)
    }
    walk(node)
    return ids
  }
  if (node.gpuForceOpacity) return []
  return wmsIdsControlledByDataLayersPanelEntry(node, mapVisibilityById)
}

export function collectWmsMapLayerIdsUnder(
  node: TreeLayerNode,
  opts?: { omitForceOpacity?: boolean },
): string[] {
  const ids: string[] = []

  function walk(n: TreeLayerNode) {
    if (n.gpuMapLayer) {
      if (!opts?.omitForceOpacity || !n.gpuForceOpacity) ids.push(n.id)
    }
    for (const child of catalogChildNodes(n)) walk(child)
  }

  walk(node)
  return ids
}

function legendFromNode(node: TreeLayerNode) {
  return node.legend?.length ? node.legend : undefined
}

export function aggregateStackNodeLegend(node: TreeLayerNode): TreeLayerNode['legend'] {
  const own = legendFromNode(node)
  if (own) return dedupeLegendItems(own)

  const items: LegendItem[] = []
  function walk(n: TreeLayerNode) {
    if (n.legend?.length) items.push(...n.legend)
    catalogChildNodes(n).forEach(walk)
  }
  for (const child of catalogChildNodes(node)) {
    walk(child)
  }
  const deduped = dedupeLegendItems(items)
  return deduped.length ? deduped : undefined
}

export function dataLayersStackToWmsIdsBottomToTop(
  stackNodesBottomToTop: TreeLayerNode[],
  mapVisibilityById: Record<string, boolean>,
): string[] {
  const ids: string[] = []
  for (const node of stackNodesBottomToTop) {
    ids.push(...wmsIdsControlledByDataLayersPanelEntry(node, mapVisibilityById))
  }
  return ids
}

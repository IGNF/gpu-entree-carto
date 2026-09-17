import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'

/** Opacité imposée par `forceOpacity` (gpu-client `Layer` → `opacity = 1.0`). */
export const GPU_FORCE_OPACITY_PERCENT = 100

export function catalogNodeOpacityPercent(node: TreeLayerNode): number {
  if (node.gpuForceOpacity) return GPU_FORCE_OPACITY_PERCENT
  if (typeof node.gpuDefaultOpacity === 'number') return node.gpuDefaultOpacity
  return 70
}

/** Couche affichable sur la carte (WMS), hors virtual (onlyLegend peut avoir une tuile). */
export function isGpuMapLayerNode(node: TreeLayerNode): boolean {
  return Boolean(node.gpuMapLayer)
}

/** Entrée empilable : WMS ou légende seule (onlyLegend). */
export function isStackableCatalogNode(node: TreeLayerNode): boolean {
  return Boolean(node.gpuMapLayer || node.gpuOnlyLegend)
}

export function catalogChildNodes(node: TreeLayerNode): TreeLayerNode[] {
  return [...(node.children ?? []), ...(node.hiddenCatalogChildren ?? [])]
}

/**
 * Nœuds affichés dans le sélecteur (gpu-client : pas de ligne pour `onlyLegend`).
 * L’index catalogue conserve ces entrées pour checkboxes / légendes / propagation.
 */
export function catalogSwitcherDisplayNodes(nodes: TreeLayerNode[]): TreeLayerNode[] {
  const out: TreeLayerNode[] = []
  for (const node of nodes) {
    if (node.gpuOnlyLegend) {
      out.push(...catalogSwitcherDisplayNodes(catalogChildNodes(node)))
      continue
    }
    const children = node.children?.length
      ? catalogSwitcherDisplayNodes(node.children)
      : undefined
    out.push({
      ...node,
      children: children?.length ? children : undefined,
    })
  }
  return out
}

/** Cibles réelles lors d’un toggle catalogue (déplie virtual / groupes, y.c. enfants masqués UI). */
export function collectCatalogToggleTargets(node: TreeLayerNode): TreeLayerNode[] {
  if (isStackableCatalogNode(node)) return [node]
  const kids = catalogChildNodes(node)
  if (kids.length) return kids.flatMap((child) => collectCatalogToggleTargets(child))
  return []
}

/** État coché catalogue pour les groupes (tous les empilables descendants cochés). */
export function buildCatalogCheckedById(
  nodes: TreeLayerNode[],
  inStackById: Record<string, boolean>,
): Record<string, boolean> {
  const out: Record<string, boolean> = { ...inStackById }

  function visit(node: TreeLayerNode): boolean {
    if (isStackableCatalogNode(node)) {
      out[node.id] = Boolean(inStackById[node.id])
      return out[node.id]
    }
    const kids = catalogChildNodes(node)
    if (kids.length) {
      const states = kids.map((child) => visit(child))
      const checked = states.length > 0 && states.every(Boolean)
      out[node.id] = checked
      return checked
    }
    out[node.id] = false
    return false
  }

  for (const root of nodes) visit(root)
  return out
}

/** Applique `visible` de LAYER_CONFIG aux couches empilables (feuilles WMS / onlyLegend). */
export function listInitiallyVisibleStackableIds(nodes: TreeLayerNode[]): string[] {
  const ids: string[] = []
  for (const node of nodes) {
    walk(node)
  }
  return ids

  function walk(node: TreeLayerNode) {
    if (isStackableCatalogNode(node)) {
      if (node.visible) ids.push(node.id)
      return
    }
    catalogChildNodes(node).forEach(walk)
  }
}

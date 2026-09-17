import { computed, ref, watch, type Ref } from 'vue'
import type { LegendItem } from '@/types/stubs'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import {
  catalogNodeOpacityPercent,
  GPU_FORCE_OPACITY_PERCENT,
  isStackableCatalogNode,
} from '@/lib/layerConfig/catalogLayerTargets'
import {
  applyUserCatalogToggle,
  computeMapVisibilityById,
  propagateCheckedToAncestors,
  propagateCheckedToDescendants,
} from '@/lib/layerConfig/catalogCheckboxLogic'
import {
  buildCatalogTreeIndex,
  flattenCatalogNodes,
  type CatalogTreeIndex,
} from '@/lib/layerConfig/catalogTreeIndex'

export interface LayerMapHooks {
  onVisible?: (id: string, visible: boolean) => void
  onOpacity?: (id: string, opacity: number) => void
  onGrayscale?: (id: string, grayscale: boolean) => void
  onStackOrder?: (orderedIdsBottomToTop: string[]) => void
}

export const DEFAULT_LAYER_OPACITY = 100

export interface ManagedLayer {
  id: string
  title: string
  inStack: boolean
  visible: boolean
  opacity: number
  grayscale: boolean
  forceOpacity: boolean
  legend?: LegendItem[]
}

function nodeLegend(node: TreeLayerNode): LegendItem[] | undefined {
  return node.legend?.length ? node.legend : undefined
}

function initialOpacity(node: TreeLayerNode): number {
  return catalogNodeOpacityPercent(node)
}

export function useManagedLayers(
  nodes: Ref<TreeLayerNode[]>,
  onMapVisibleChange: (id: string, visible: boolean) => void,
  mapHooks?: LayerMapHooks,
) {
  const layers = ref<ManagedLayer[]>([])
  const catalogChecked = ref<Record<string, boolean>>({})
  let treeIndex: CatalogTreeIndex = buildCatalogTreeIndex([])

  function rebuildManagedLayersFromTree(roots: TreeLayerNode[]) {
    const flat = flattenCatalogNodes(roots).filter(isStackableCatalogNode)
    const prev = new Map(layers.value.map((l) => [l.id, l]))
    layers.value = flat.map((node) => {
      const existing = prev.get(node.id)
      if (existing) {
        return {
          ...existing,
          title: node.title,
          forceOpacity: Boolean(node.gpuForceOpacity),
          legend: nodeLegend(node) ?? existing.legend,
        }
      }
      const forceOpacity = Boolean(node.gpuForceOpacity)
      return {
        id: node.id,
        title: node.title,
        inStack: false,
        visible: false,
        opacity: forceOpacity ? GPU_FORCE_OPACITY_PERCENT : initialOpacity(node),
        grayscale: false,
        forceOpacity,
        legend: nodeLegend(node),
      }
    })
  }

  function initCatalogCheckedFromConfig(roots: TreeLayerNode[]) {
    const next: Record<string, boolean> = {}
    for (const node of flattenCatalogNodes(roots)) {
      next[node.id] = Boolean(node.visible)
    }
    for (const node of flattenCatalogNodes(roots)) {
      if (next[node.id]) {
        propagateCheckedToAncestors(next, node.id, treeIndex)
      }
    }
    syncCheckedDownFromRoots(roots, next)
    catalogChecked.value = next
  }

  /** Propage l’état de chaque racine à tout son sous-arbre (récursif). */
  function syncCheckedDownFromRoots(roots: TreeLayerNode[], checked: Record<string, boolean>) {
    for (const root of roots) {
      propagateCheckedToDescendants(checked, root, Boolean(checked[root.id]), treeIndex)
    }
  }

  function opacityById(): Record<string, number> {
    const map: Record<string, number> = {}
    for (const layer of layers.value) {
      map[layer.id] = layer.forceOpacity ? GPU_FORCE_OPACITY_PERCENT : layer.opacity
    }
    for (const node of treeIndex.nodesById.values()) {
      if (map[node.id] === undefined) {
        map[node.id] = catalogNodeOpacityPercent(node)
      }
    }
    return map
  }

  function findNode(id: string): TreeLayerNode | undefined {
    return treeIndex.nodesById.get(id)
  }

  function syncMapVisible(id: string, visible: boolean) {
    const node = findNode(id)
    if (node && !node.gpuMapLayer) return
    onMapVisibleChange(id, visible)
    mapHooks?.onVisible?.(id, visible)
  }

  function applyOpacityToMap(id: string, opacity: number) {
    mapHooks?.onOpacity?.(id, opacity)
  }

  function stackedIdsBottomToTop(): string[] {
    return layers.value.filter((l) => l.inStack).map((l) => l.id)
  }

  function notifyStackOrder() {
    mapHooks?.onStackOrder?.(stackedIdsBottomToTop())
  }

  function reapplyCatalogMapState() {
    const mapVis = computeMapVisibilityById(
      catalogChecked.value,
      treeIndex,
      opacityById(),
    )

    for (const layer of layers.value) {
      const checked = Boolean(catalogChecked.value[layer.id])
      layer.inStack = checked

      const node = findNode(layer.id)
      if (layer.forceOpacity) {
        layer.opacity = GPU_FORCE_OPACITY_PERCENT
      }

      const onMap = mapVis[layer.id] ?? false
      if (layer.visible !== onMap) {
        layer.visible = onMap
        if (onMap && node) {
          layer.opacity = catalogNodeOpacityPercent(node)
          if (node.gpuMapLayer) applyOpacityToMap(layer.id, layer.opacity)
        } else if (!onMap) {
          layer.grayscale = false
          mapHooks?.onGrayscale?.(layer.id, false)
        }
        syncMapVisible(layer.id, onMap)
      } else if (onMap && layer.visible && node?.gpuMapLayer && layer.forceOpacity) {
        applyOpacityToMap(layer.id, GPU_FORCE_OPACITY_PERCENT)
      }
    }
    notifyStackOrder()
  }

  watch(
    () => nodes.value,
    (roots, prevRoots) => {
      const prevIds = prevRoots ? flattenCatalogNodes(prevRoots).map((n) => n.id).join('|') : ''
      const nextIds = flattenCatalogNodes(roots).map((n) => n.id).join('|')
      const structureChanged = prevIds !== nextIds

      treeIndex = buildCatalogTreeIndex(roots)
      rebuildManagedLayersFromTree(roots)

      if (structureChanged || !Object.keys(catalogChecked.value).length) {
        initCatalogCheckedFromConfig(roots)
      }
      reapplyCatalogMapState()
    },
    { immediate: true },
  )

  const stackLayers = computed(() => {
    const stacked = layers.value.filter((l) => l.inStack)
    return [...stacked].reverse()
  })

  const legendLayers = computed(() =>
    layers.value.filter((l) => l.inStack && l.visible),
  )

  const catalogCheckedById = computed(() => {
    const out: Record<string, boolean> = { ...catalogChecked.value }
    for (const node of treeIndex.nodesById.values()) {
      if (out[node.id] === undefined) out[node.id] = false
    }
    return out
  })

  function setCatalogChecked(id: string, checked: boolean) {
    if (!treeIndex.nodesById.has(id)) return
    applyUserCatalogToggle(catalogChecked.value, id, checked, treeIndex)
    catalogChecked.value = { ...catalogChecked.value }
    reapplyCatalogMapState()
  }

  function setInStack(id: string, inStack: boolean) {
    setCatalogChecked(id, inStack)
  }

  function setVisible(id: string, visible: boolean) {
    const layer = layers.value.find((l) => l.id === id)
    if (!layer?.inStack) return
    layer.visible = visible
    syncMapVisible(id, visible)
  }

  function setOpacity(id: string, opacity: number) {
    const layer = layers.value.find((l) => l.id === id)
    if (!layer || layer.forceOpacity) return
    layer.opacity = Math.min(100, Math.max(0, opacity))
    applyOpacityToMap(id, layer.opacity)
    reapplyCatalogMapState()
  }

  function setGrayscale(id: string, grayscale: boolean) {
    const layer = layers.value.find((l) => l.id === id)
    if (!layer?.inStack) return
    layer.grayscale = grayscale
    mapHooks?.onGrayscale?.(id, grayscale)
  }

  function toggleGrayscale(id: string) {
    const layer = layers.value.find((l) => l.id === id)
    if (!layer?.inStack) return
    setGrayscale(id, !layer.grayscale)
  }

  function removeFromStack(id: string) {
    setCatalogChecked(id, false)
  }

  function reorderStackByDisplayIndex(fromDisplayIndex: number, toDisplayIndex: number) {
    const display = [...stackLayers.value]
    if (
      fromDisplayIndex < 0 ||
      fromDisplayIndex >= display.length ||
      toDisplayIndex < 0 ||
      toDisplayIndex >= display.length ||
      fromDisplayIndex === toDisplayIndex
    ) {
      return
    }
    const [item] = display.splice(fromDisplayIndex, 1)
    display.splice(toDisplayIndex, 0, item!)
    const stacked = [...display].reverse()
    const rest = layers.value.filter((l) => !l.inStack)
    layers.value = [...stacked, ...rest]
    notifyStackOrder()
  }

  return {
    layers,
    stackLayers,
    legendLayers,
    catalogCheckedById,
    setCatalogChecked,
    setInStack,
    setVisible,
    setOpacity,
    setGrayscale,
    toggleGrayscale,
    removeFromStack,
    reorderStackByDisplayIndex,
    notifyStackOrder,
    reapplyCatalogMapState,
  }
}

export type ManagedLayersApi = ReturnType<typeof useManagedLayers>

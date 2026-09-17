import { computed, ref, watch, type Ref } from 'vue'
import type { LegendItem } from '@/types/stubs'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import {
  catalogNodeOpacityPercent,
  GPU_FORCE_OPACITY_PERCENT,
} from '@/lib/layerConfig/catalogLayerTargets'
import {
  aggregateStackNodeLegend,
  collectActiveOnlyLegendNodesForLegendsPanel,
  collectDataLayersStackNodes,
  dataLayersStackToWmsIdsBottomToTop,
  defaultPanelStateForNode,
  shouldShowInDataLayersStack,
  wmsIdsControlledByDataLayersPanelEntry,
  catalogIdsForPanelOpacityWhenEntryAdjusted,
  type PanelLayerState,
} from '@/lib/layerConfig/catalogDataLayersStack'
import {
  applyUserCatalogToggle,
  computeMapVisibilityById,
  propagateCheckedToAncestors,
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

export function useManagedLayers(
  nodes: Ref<TreeLayerNode[]>,
  onMapVisibleChange: (id: string, visible: boolean) => void,
  mapHooks?: LayerMapHooks,
) {
  const catalogChecked = ref<Record<string, boolean>>({})
  const panelStateById = ref<Record<string, PanelLayerState>>({})
  let treeIndex: CatalogTreeIndex = buildCatalogTreeIndex([])

  function getPanelState(node: TreeLayerNode): PanelLayerState {
    const existing = panelStateById.value[node.id]
    if (existing) return existing
    const next = defaultPanelStateForNode(node)
    panelStateById.value = { ...panelStateById.value, [node.id]: next }
    return next
  }

  function patchPanelState(id: string, patch: Partial<PanelLayerState>) {
    const node = treeIndex.nodesById.get(id)
    if (!node) return
    const prev = getPanelState(node)
    panelStateById.value = {
      ...panelStateById.value,
      [id]: { ...prev, ...patch },
    }
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
    catalogChecked.value = next
  }

  function opacityById(): Record<string, number> {
    const map: Record<string, number> = {}
    for (const node of treeIndex.nodesById.values()) {
      const panel = panelStateById.value[node.id]
      if (panel && !node.gpuForceOpacity) {
        map[node.id] = panel.opacity
        continue
      }
      if (!node.gpuMapLayer) continue
      map[node.id] = node.gpuForceOpacity
        ? GPU_FORCE_OPACITY_PERCENT
        : catalogNodeOpacityPercent(node)
    }
    return map
  }

  function catalogMapVisibility(): Record<string, boolean> {
    return computeMapVisibilityById(
      catalogChecked.value,
      treeIndex,
      opacityById(),
    )
  }

  function syncMapVisible(wmsCatalogId: string, visible: boolean) {
    onMapVisibleChange(wmsCatalogId, visible)
    mapHooks?.onVisible?.(wmsCatalogId, visible)
  }

  function applyOpacityToMap(wmsCatalogId: string, opacity: number) {
    mapHooks?.onOpacity?.(wmsCatalogId, opacity)
  }

  function applyGrayscaleToMap(wmsCatalogId: string, grayscale: boolean) {
    mapHooks?.onGrayscale?.(wmsCatalogId, grayscale)
  }

  function applyPanelStateToControlledWms(
    node: TreeLayerNode,
    state: PanelLayerState,
    mapVis: Record<string, boolean>,
  ) {
    for (const wmsId of wmsIdsControlledByDataLayersPanelEntry(node, mapVis)) {
      const wmsNode = treeIndex.nodesById.get(wmsId)
      if (!wmsNode?.gpuMapLayer) continue
      syncMapVisible(wmsId, state.visible)
      if (!wmsNode.gpuForceOpacity) {
        applyOpacityToMap(wmsId, state.opacity)
      } else {
        applyOpacityToMap(wmsId, GPU_FORCE_OPACITY_PERCENT)
      }
      applyGrayscaleToMap(wmsId, state.grayscale)
    }
  }

  function syncPanelStateFromControlledWms(
    node: TreeLayerNode,
    mapVis: Record<string, boolean>,
  ) {
    const wmsIds = wmsIdsControlledByDataLayersPanelEntry(node, mapVis)
    if (!wmsIds.length) return

    const visible = wmsIds.some((id) => Boolean(mapVis[id]))

    const opacityWmsIds = wmsIds.filter((id) => {
      const n = treeIndex.nodesById.get(id)
      return n && !n.gpuForceOpacity
    })
    let opacity = getPanelState(node).opacity
    if (opacityWmsIds.length) {
      const opacities = opacityWmsIds.map(
        (id) =>
          panelStateById.value[id]?.opacity ??
          catalogNodeOpacityPercent(treeIndex.nodesById.get(id)!),
      )
      opacity = opacities[0]!
    }

    patchPanelState(node.id, { visible, opacity })
  }

  function stackNodesBottomToTop(): TreeLayerNode[] {
    const mapVis = catalogMapVisibility()
    return collectDataLayersStackNodes(
      treeIndex.roots,
      catalogChecked.value,
      treeIndex.parentById,
      mapVis,
    )
  }

  /** Ordre panneau : index 0 = haut = z-index max sur la carte. */
  const stackDisplayOrderIds = ref<string[]>([])

  function mergeStackDisplayOrderWithCatalog(catalogIds: string[]) {
    const catalogSet = new Set(catalogIds)
    const kept = stackDisplayOrderIds.value.filter((id) => catalogSet.has(id))
    const keptSet = new Set(kept)
    const added = catalogIds.filter((id) => !keptSet.has(id))
    stackDisplayOrderIds.value = [...kept, ...added]
  }

  function stackNodesForDisplayOrder(): TreeLayerNode[] {
    const byId = new Map(stackNodesBottomToTop().map((n) => [n.id, n]))
    const ids = stackDisplayOrderIds.value.filter((id) => byId.has(id))
    for (const node of byId.values()) {
      if (!ids.includes(node.id)) ids.push(node.id)
    }
    return ids
      .map((id) => byId.get(id))
      .filter((n): n is TreeLayerNode => Boolean(n))
  }

  function applyMapStackOrderFromDisplay() {
    const mapVis = catalogMapVisibility()
    const nodesBottomToTop = [...stackNodesForDisplayOrder()].reverse()
    mapHooks?.onStackOrder?.(
      dataLayersStackToWmsIdsBottomToTop(nodesBottomToTop, mapVis),
    )
  }

  function notifyStackOrder() {
    applyMapStackOrderFromDisplay()
  }

  function reapplyCatalogMapState() {
    const mapVis = catalogMapVisibility()

    for (const node of treeIndex.nodesById.values()) {
      if (!node.gpuMapLayer) continue
      const onMap = mapVis[node.id] ?? false
      syncMapVisible(node.id, onMap)
      if (onMap) {
        const n = treeIndex.nodesById.get(node.id)!
        const op = n.gpuForceOpacity
          ? GPU_FORCE_OPACITY_PERCENT
          : (panelStateById.value[node.id]?.opacity ?? catalogNodeOpacityPercent(n))
        applyOpacityToMap(node.id, op)
        const gs = panelStateById.value[node.id]?.grayscale ?? false
        applyGrayscaleToMap(node.id, gs)
      }
    }

    for (const node of [...stackNodesBottomToTop()].reverse()) {
      syncPanelStateFromControlledWms(node, mapVis)
    }

    notifyStackOrder()
  }

  function isShownInDataLayersPanel(id: string): boolean {
    const node = treeIndex.nodesById.get(id)
    if (!node) return false
    return shouldShowInDataLayersStack(
      node,
      catalogChecked.value,
      treeIndex.parentById,
      catalogMapVisibility(),
    )
  }

  watch(
    () => nodes.value,
    (roots, prevRoots) => {
      const prevIds = prevRoots ? flattenCatalogNodes(prevRoots).map((n) => n.id).join('|') : ''
      const nextIds = flattenCatalogNodes(roots).map((n) => n.id).join('|')
      const structureChanged = prevIds !== nextIds

      treeIndex = buildCatalogTreeIndex(roots)

      if (structureChanged || !Object.keys(catalogChecked.value).length) {
        initCatalogCheckedFromConfig(roots)
      }
      reapplyCatalogMapState()
    },
    { immediate: true },
  )

  const stackLayers = computed((): ManagedLayer[] => {
    const stackNodes = stackNodesBottomToTop()
    return stackNodes.map((node) => {
      const state = getPanelState(node)
      return {
        id: node.id,
        title: node.title,
        inStack: true,
        visible: state.visible,
        opacity: node.gpuForceOpacity ? GPU_FORCE_OPACITY_PERCENT : state.opacity,
        grayscale: state.grayscale,
        forceOpacity: Boolean(node.gpuForceOpacity),
        legend: aggregateStackNodeLegend(node),
      }
    })
  })

  const layers = computed((): ManagedLayer[] => {
    const byId = new Map(stackLayers.value.map((l) => [l.id, l]))
    const ids = stackDisplayOrderIds.value.filter((id) => byId.has(id))
    for (const layer of stackLayers.value) {
      if (!ids.includes(layer.id)) ids.push(layer.id)
    }
    return ids.map((id) => byId.get(id)!)
  })

  const legendLayers = computed((): ManagedLayer[] => {
    const fromStack = layers.value.filter((l) => l.visible && l.legend?.length)
    const seen = new Set(fromStack.map((l) => l.id))
    const mapVis = catalogMapVisibility()
    const onlyLegendRows = collectActiveOnlyLegendNodesForLegendsPanel(
      nodes.value,
      catalogChecked.value,
      mapVis,
    )
      .filter((node) => !seen.has(node.id))
      .map(
        (node): ManagedLayer => ({
          id: node.id,
          title: node.title,
          inStack: false,
          visible: true,
          opacity: catalogNodeOpacityPercent(node),
          grayscale: false,
          forceOpacity: false,
          legend: node.legend,
        }),
      )
    return [...fromStack, ...onlyLegendRows]
  })

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
    const node = treeIndex.nodesById.get(id)
    if (!node || !isShownInDataLayersPanel(id)) return
    const mapVis = catalogMapVisibility()
    patchPanelState(id, { visible })
    for (const wmsId of wmsIdsControlledByDataLayersPanelEntry(node, mapVis)) {
      patchPanelState(wmsId, { visible })
    }
    applyPanelStateToControlledWms(node, getPanelState(node), mapVis)
  }

  function setOpacity(id: string, opacity: number) {
    const node = treeIndex.nodesById.get(id)
    if (!node || node.gpuForceOpacity) return
    if (!isShownInDataLayersPanel(id)) return
    const value = Math.min(100, Math.max(0, opacity))
    const mapVis = catalogMapVisibility()
    patchPanelState(id, { opacity: value })
    for (const catalogId of catalogIdsForPanelOpacityWhenEntryAdjusted(node, mapVis)) {
      patchPanelState(catalogId, { opacity: value })
    }
    applyPanelStateToControlledWms(node, { ...getPanelState(node), opacity: value }, mapVis)
    reapplyCatalogMapState()
  }

  function setGrayscale(id: string, grayscale: boolean) {
    const node = treeIndex.nodesById.get(id)
    if (!node || !isShownInDataLayersPanel(id)) return
    const mapVis = catalogMapVisibility()
    patchPanelState(id, { grayscale })
    for (const wmsId of wmsIdsControlledByDataLayersPanelEntry(node, mapVis)) {
      patchPanelState(wmsId, { grayscale })
    }
    applyPanelStateToControlledWms(node, getPanelState(node), mapVis)
  }

  function toggleGrayscale(id: string) {
    const node = treeIndex.nodesById.get(id)
    if (!node) return
    setGrayscale(id, !getPanelState(node).grayscale)
  }

  function removeFromStack(id: string) {
    setCatalogChecked(id, false)
  }

  watch(
    () => stackLayers.value.map((l) => l.id).join('|'),
    () => {
      mergeStackDisplayOrderWithCatalog(stackLayers.value.map((l) => l.id))
    },
    { immediate: true },
  )

  /** @param toInsertBefore index d’insertion (0 = tout en haut). */
  function reorderStackByDisplayIndex(fromDisplayIndex: number, toInsertBefore: number) {
    const order = layers.value.map((l) => l.id)
    if (fromDisplayIndex < 0 || fromDisplayIndex >= order.length) return
    if (toInsertBefore < 0 || toInsertBefore > order.length) return
    if (fromDisplayIndex === toInsertBefore || fromDisplayIndex + 1 === toInsertBefore) {
      return
    }
    const [item] = order.splice(fromDisplayIndex, 1)
    let insertAt = toInsertBefore
    if (fromDisplayIndex < toInsertBefore) insertAt -= 1
    order.splice(insertAt, 0, item!)
    stackDisplayOrderIds.value = order
    applyMapStackOrderFromDisplay()
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

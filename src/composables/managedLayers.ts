import { computed, ref, watch, type Ref } from 'vue'
import type { LegendItem } from '@/types/stubs'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import { flattenTreeLayerNodes } from '@/lib/layerConfig/layerConfigToTree'

export interface LayerMapHooks {
  onVisible?: (id: string, visible: boolean) => void
  onOpacity?: (id: string, opacity: number) => void
  /** Ids des couches empilées, du bas vers le haut (z-index carte). */
  onStackOrder?: (orderedIdsBottomToTop: string[]) => void
}

export const DEFAULT_LAYER_OPACITY = 100

export interface ManagedLayer {
  id: string
  title: string
  /** Couche ajoutée depuis le catalogue (onglet gestionnaire). */
  inStack: boolean
  /** Affichée sur la carte. */
  visible: boolean
  opacity: number
  /** Opacité « contraste par défaut » (bouton contraste). */
  defaultOpacity: number
  legend?: LegendItem[]
}

function nodeLegend(node: TreeLayerNode): LegendItem[] | undefined {
  return node.legend?.length ? node.legend : undefined
}

/**
 * État catalogue → pile « Couches de données » → légendes.
 * Synchronise `nodes[].visible` avec la visibilité carte lors des changements.
 */
export function useManagedLayers(
  nodes: Ref<TreeLayerNode[]>,
  onMapVisibleChange: (id: string, visible: boolean) => void,
  mapHooks?: LayerMapHooks,
) {
  const layers = ref<ManagedLayer[]>([])

  watch(
    nodes,
    (next) => {
      const flat = flattenTreeLayerNodes(next)
      const prev = new Map(layers.value.map((l) => [l.id, l]))
      layers.value = flat.map((node) => {
        const existing = prev.get(node.id)
        if (existing) {
          return {
            ...existing,
            title: node.title,
            legend: nodeLegend(node) ?? existing.legend,
          }
        }
        return {
          id: node.id,
          title: node.title,
          inStack: Boolean(node.visible),
          visible: Boolean(node.visible),
          opacity: DEFAULT_LAYER_OPACITY,
          defaultOpacity: DEFAULT_LAYER_OPACITY,
          legend: nodeLegend(node),
        }
      })
    },
    { immediate: true, deep: true },
  )

  const stackLayers = computed(() => {
    const stacked = layers.value.filter((l) => l.inStack)
    return [...stacked].reverse()
  })

  const legendLayers = computed(() =>
    layers.value.filter((l) => l.inStack && l.visible),
  )

  function findNode(id: string): TreeLayerNode | undefined {
    return flattenTreeLayerNodes(nodes.value).find((n) => n.id === id)
  }

  function syncMapVisible(id: string, visible: boolean) {
    onMapVisibleChange(id, visible)
    mapHooks?.onVisible?.(id, visible)
    const node = findNode(id)
    if (node) node.visible = visible
  }

  function stackedIdsBottomToTop(): string[] {
    return layers.value.filter((l) => l.inStack).map((l) => l.id)
  }

  function notifyStackOrder() {
    mapHooks?.onStackOrder?.(stackedIdsBottomToTop())
  }

  function setInStack(id: string, inStack: boolean) {
    const layer = layers.value.find((l) => l.id === id)
    if (!layer) return
    layer.inStack = inStack
    if (inStack) {
      layer.visible = true
      syncMapVisible(id, true)
      notifyStackOrder()
    } else {
      layer.visible = false
      syncMapVisible(id, false)
      notifyStackOrder()
    }
  }

  function setVisible(id: string, visible: boolean) {
    const layer = layers.value.find((l) => l.id === id)
    if (!layer?.inStack) return
    layer.visible = visible
    syncMapVisible(id, visible)
  }

  function setOpacity(id: string, opacity: number) {
    const layer = layers.value.find((l) => l.id === id)
    if (!layer) return
    layer.opacity = Math.min(100, Math.max(0, opacity))
    mapHooks?.onOpacity?.(id, layer.opacity)
  }

  function resetOpacity(id: string) {
    const layer = layers.value.find((l) => l.id === id)
    if (!layer) return
    setOpacity(id, layer.defaultOpacity)
  }

  function removeFromStack(id: string) {
    setInStack(id, false)
  }

  /** Réordonne la pile selon l’ordre d’affichage UI (haut de liste = dessus sur la carte). */
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
    setInStack,
    setVisible,
    setOpacity,
    resetOpacity,
    removeFromStack,
    reorderStackByDisplayIndex,
    notifyStackOrder,
  }
}

export type ManagedLayersApi = ReturnType<typeof useManagedLayers>

<script setup lang="ts">
/**
 * Contrôle OpenLayers — panneau latéral à 4 onglets (droite de la carte).
 * Masqué par défaut ; ouverture via onglet ou `showSelection` (localisation).
 */
import {
  computed,
  inject,
  nextTick,
  onUnmounted,
  provide,
  ref,
  shallowRef,
  toRef,
  watch,
  type ShallowRef,
} from 'vue'
import { registerMapPermalinkLayersBridge } from '@/composables/mapPermalinkLayersBridge'
import {
  getMapPermalinkParams,
  layerPermalinkEntriesFromParams,
  replaceLayerPermalinkParams,
  type MapPermalinkParams,
} from '@/lib/map/mapPermalink'
import {
  buildCatalogIdByPermalinkId,
  decodeLayerPermalinkValue,
  defaultOpacityFromCatalogEntry,
  encodeLayerPermalinkValue,
  type LayerPermalinkState,
} from '@/lib/map/mapPermalinkLayers'
import {
  layerConfigToCatalogEntries,
  resolveLayerConfig,
  type GpuLayerCatalogEntry,
} from '@/lib/layerConfig/gpuLayerConfig'
import Control from 'ol/control/Control'
import type Map from 'ol/Map'
import {
  legendPanelFocusRef,
  registerTabPanelsApi,
  TAB_PANELS_KEY,
  TAB_PANEL_IDS,
  type FicheInfoSelection,
  type TabPanelsApi,
} from '@/composables/tabPanels'
import { useMapZoom } from '@/composables/useMapZoom'
import { useManagedLayers, type LayerMapHooks } from '@/composables/managedLayers'
import FicheInfoPanel from '@/components/panels/FicheInfoPanel.vue'
import LayerCataloguePanel from '@/components/panels/LayerCataloguePanel.vue'
import DataLayersManagerPanel from '@/components/panels/DataLayersManagerPanel.vue'
import LayerLegendsPanel from '@/components/panels/LayerLegendsPanel.vue'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import type { GpuBaseLayerId, GpuBaseLayerPreset } from '@/ol/gpuBaseLayerPresets'
import '@/styles/tab-panels.css'

const props = withDefaults(
  defineProps<{
    basePresets?: GpuBaseLayerPreset[]
    baseModelValue?: GpuBaseLayerId
    layerNodes?: TreeLayerNode[]
    layerMapHooks?: LayerMapHooks
    catalogLayersLoading?: boolean
  }>(),
  {
    basePresets: () => [],
    baseModelValue: 'carte',
    layerNodes: () => [],
    layerMapHooks: undefined,
    catalogLayersLoading: false,
  },
)

const emit = defineEmits<{
  'update:baseModelValue': [id: GpuBaseLayerId]
  'toggle-layer': [id: string, visible: boolean]
}>()

const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
const rootEl = ref<HTMLElement | null>(null)
let olControl: Control | null = null

const isOpen = ref(false)
const activeTab = ref<number | null>(null)
const selection = ref<FicheInfoSelection | null>(null)

const layerNodesRef = toRef(props, 'layerNodes')
const { mapZoom } = useMapZoom()

const {
  layers,
  legendLayers,
  catalogCheckedById,
  catalogEntryInZoomRange,
  setCatalogChecked,
  applyDataLayerPermalinkPanelState,
  setVisible,
  setOpacity,
  toggleGrayscale,
  removeFromStack,
  reorderStackByDisplayIndex,
  applyStackOrderFromPermalink,
  enableAggregateDetail,
  regroupAggregate,
  notifyStackOrder,
  reapplyCatalogMapState,
} = useManagedLayers(
  layerNodesRef,
  (id, visible) => emit('toggle-layer', id, visible),
  props.layerMapHooks,
)

watch(
  () =>
    layers.value
      .filter((l) => l.inStack)
      .map((l) => l.id)
      .join(','),
  () => notifyStackOrder(),
  { immediate: true },
)

type TabDef = {
  id: number
  label: string
  iconKind: 'dsfr' | 'remix'
  iconClass: string
}

const tabs: TabDef[] = [
  {
    id: TAB_PANEL_IDS.fiche,
    label: 'Informations / localisation',
    iconKind: 'dsfr',
    iconClass: 'fr-icon-map-pin-2-line',
  },
  {
    id: TAB_PANEL_IDS.catalogue,
    label: 'Catalogue',
    iconKind: 'remix',
    iconClass: 'ri-map-2-line',
  },
  {
    id: TAB_PANEL_IDS.dataLayers,
    label: 'Couches de données',
    iconKind: 'remix',
    iconClass: 'ri-stack-line',
  },
  {
    id: TAB_PANEL_IDS.legends,
    label: 'Légendes',
    iconKind: 'remix',
    iconClass: 'ri-list-indefinite',
  },
]

function openTab(index: number) {
  if (index < 0 || index >= tabs.length) return
  activeTab.value = index
  isOpen.value = true
}

function closePanels() {
  isOpen.value = false
  activeTab.value = null
}

function onTabClick(index: number) {
  if (isOpen.value && activeTab.value === index) {
    closePanels()
    return
  }
  openTab(index)
}

function showSelection(next: FicheInfoSelection) {
  selection.value = next
  openTab(TAB_PANEL_IDS.fiche)
}

function openLegendForLayer(layerId: string) {
  legendPanelFocusRef.value = { layerId, at: Date.now() }
  openTab(TAB_PANEL_IDS.legends)
}

function clearSelection() {
  selection.value = null
}

function syncShellOpenClass(open: boolean) {
  const target = mapRef.value?.getTargetElement()
  const shell =
    (target instanceof HTMLElement ? target.closest('.ec-map-shell') : null) ??
    rootEl.value?.closest('.ec-map-shell')
  shell?.classList.toggle('ec-map-shell--tab-panels-open', open)
}

const api: TabPanelsApi = {
  openTab,
  openLegendForLayer,
  closePanels,
  showSelection,
  clearSelection,
  isOpen,
  activeTab,
  selection,
}

provide(TAB_PANELS_KEY, api)
registerTabPanelsApi(api)
defineExpose(api)

watch(isOpen, (open) => syncShellOpenClass(open))

watch(
  [mapRef, rootEl],
  ([map, el], _prev, onCleanup) => {
    if (olControl) {
      mapRef.value?.removeControl(olControl)
      olControl = null
    }
    if (!map || !el) return

    olControl = new Control({ element: el })
    map.addControl(olControl)
    syncShellOpenClass(isOpen.value)

    onCleanup(() => {
      syncShellOpenClass(false)
      if (olControl && map) {
        map.removeControl(olControl)
        olControl = null
      }
    })
  },
  { immediate: true },
)

const catalogEntries = computed(() => {
  // Re-calcul quand LAYER_CONFIG / arbre catalogue est prêt (chargement async gpu-client-config).
  void layerNodesRef.value.length
  return layerConfigToCatalogEntries(resolveLayerConfig() ?? [])
})
const catalogIdByPermalink = computed(() => buildCatalogIdByPermalinkId(catalogEntries.value))

function findCatalogTreeNode(id: string, roots = layerNodesRef.value): TreeLayerNode | undefined {
  for (const node of roots) {
    if (node.id === id) return node
    if (node.children?.length) {
      const hit = findCatalogTreeNode(id, node.children)
      if (hit) return hit
    }
  }
  return undefined
}

function configDefaultCatalogChecked(entry: GpuLayerCatalogEntry): boolean {
  return Boolean(findCatalogTreeNode(entry.id)?.visible)
}

function layerPermalinkStateForEntry(entry: GpuLayerCatalogEntry): LayerPermalinkState {
  const nodeId = entry.id
  const checked = Boolean(catalogCheckedById.value[nodeId])
  const row = layers.value.find((l) => l.id === nodeId)
  const stackIds = layers.value.filter((l) => l.inStack).map((l) => l.id)
  const stackIndex = row?.inStack ? stackIds.indexOf(nodeId) : 0
  const opacity = row ? row.opacity / 100 : defaultOpacityFromCatalogEntry(entry)
  return {
    checked,
    opacity,
    stackIndex: stackIndex >= 0 ? stackIndex : 0,
    grayscale: row?.grayscale ?? false,
    visible: row?.visible ?? true,
  }
}

function layerStateDiffersFromConfig(entry: GpuLayerCatalogEntry): boolean {
  const state = layerPermalinkStateForEntry(entry)
  const defaultChecked = configDefaultCatalogChecked(entry)
  if (state.checked !== defaultChecked) return true
  const defaultOpacity = defaultOpacityFromCatalogEntry(entry)
  if (Math.abs(state.opacity - defaultOpacity) > 0.0001) return true
  if (state.grayscale) return true
  if (state.checked && !state.visible) return true
  return false
}

function primaryPermalinkIdForEntry(entry: GpuLayerCatalogEntry): string {
  const parts = entry.path.split('/').filter(Boolean)
  if (!parts.length) return entry.config.name ?? entry.id
  if (parts.length === 1) return parts[0]!
  return parts.join(',')
}

function collectLayerParamsForPermalink(): MapPermalinkParams {
  const out: MapPermalinkParams = {}
  for (const entry of catalogEntries.value) {
    if (entry.config.onlyLegend) continue
    const state = layerPermalinkStateForEntry(entry)
    if (!state.checked && !layerStateDiffersFromConfig(entry)) continue
    const permalinkId = primaryPermalinkIdForEntry(entry)
    if (!permalinkId) continue
    out[permalinkId] = encodeLayerPermalinkValue(state)
  }
  return out
}

function applyLayerParamsFromPermalink(params: MapPermalinkParams): void {
  const items = layerPermalinkEntriesFromParams(params)
  if (!items.length) return
  if (!layerNodesRef.value.length) return
  const stackIndexByNodeId: Record<string, number> = {}
  const panelOverrides: Array<{ nodeId: string; state: LayerPermalinkState }> = []
  for (const { permalinkId, value } of items) {
    const nodeId = catalogIdByPermalink.value.get(permalinkId)
    if (!nodeId) continue
    const state = decodeLayerPermalinkValue(value)
    if (!state) continue
    setCatalogChecked(nodeId, state.checked)
    if (state.checked) {
      panelOverrides.push({ nodeId, state })
      stackIndexByNodeId[nodeId] = state.stackIndex
    }
  }
  reapplyCatalogMapState()
  for (const { nodeId, state } of panelOverrides) {
    applyDataLayerPermalinkPanelState(nodeId, {
      visible: state.visible,
      opacity: Math.round(state.opacity * 100),
      grayscale: state.grayscale,
    })
  }
  applyStackOrderFromPermalink(stackIndexByNodeId)
}

function scheduleApplyLayerParamsFromPermalink(): void {
  void nextTick(() => {
    applyLayerParamsFromPermalink(getMapPermalinkParams())
  })
}

registerMapPermalinkLayersBridge({
  applyLayerParamsFromPermalink,
  collectLayerParamsForPermalink,
})

watch(
  () => [catalogEntries.value.length, layerNodesRef.value.length] as const,
  ([entryLen, nodeLen], prev) => {
    const [prevEntryLen = 0, prevNodeLen = 0] = prev ?? [0, 0]
    const becameReady = entryLen > 0 && nodeLen > 0 && (prevEntryLen === 0 || prevNodeLen === 0)
    if (becameReady) scheduleApplyLayerParamsFromPermalink()
  },
)

let layerPermalinkSyncTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () =>
    [
      JSON.stringify(catalogCheckedById.value),
      layers.value
        .map((l) => `${l.id}:${l.inStack}:${l.visible}:${l.opacity}:${l.grayscale}`)
        .join('|'),
    ].join(';'),
  () => {
    if (layerPermalinkSyncTimer) clearTimeout(layerPermalinkSyncTimer)
    layerPermalinkSyncTimer = setTimeout(() => {
      layerPermalinkSyncTimer = null
      replaceLayerPermalinkParams(collectLayerParamsForPermalink())
    }, 300)
  },
)

onUnmounted(() => {
  syncShellOpenClass(false)
  registerMapPermalinkLayersBridge(null)
  registerTabPanelsApi(null)
  if (olControl && mapRef.value) {
    mapRef.value.removeControl(olControl)
  }
  olControl = null
})
</script>

<template>
  <div
    ref="rootEl"
    class="ec-tab-panels ol-unselectable ol-control"
    :class="{ 'is-open': isOpen }"
    role="complementary"
    aria-label="Panneau cartographique"
  >
    <div
      class="ec-tab-panels__tabs"
      role="tablist"
      aria-orientation="vertical"
      aria-label="Onglets du panneau"
    >
      <button
        v-for="tab in tabs"
        :id="`ec-tab-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        class="ec-tab-panels__tab"
        :class="[
          tab.iconKind === 'dsfr' ? tab.iconClass : 'ec-tab-panels__tab--remix',
          { 'is-active': isOpen && activeTab === tab.id },
        ]"
        :aria-selected="isOpen && activeTab === tab.id"
        :aria-controls="`ec-tab-panel-${tab.id}`"
        :aria-label="tab.label"
        @click="onTabClick(tab.id)"
      >
        <i v-if="tab.iconKind === 'remix'" :class="tab.iconClass" aria-hidden="true" />
      </button>
    </div>

    <div class="ec-tab-panels__panel">
      <div class="ec-tab-panels__panel-body">
        <div
          :id="`ec-tab-panel-${TAB_PANEL_IDS.fiche}`"
          class="ec-tab-panels__pane"
          role="tabpanel"
          :hidden="activeTab !== TAB_PANEL_IDS.fiche"
          :aria-labelledby="`ec-tab-${TAB_PANEL_IDS.fiche}`"
        >
          <FicheInfoPanel :selection="selection" />
        </div>

        <div
          :id="`ec-tab-panel-${TAB_PANEL_IDS.catalogue}`"
          class="ec-tab-panels__pane"
          role="tabpanel"
          :hidden="activeTab !== TAB_PANEL_IDS.catalogue"
          :aria-labelledby="`ec-tab-${TAB_PANEL_IDS.catalogue}`"
        >
          <LayerCataloguePanel
            :layer-nodes="layerNodes"
            :in-stack-by-id="catalogCheckedById"
            :map-zoom="mapZoom"
            :base-presets="basePresets"
            :base-model-value="baseModelValue"
            :catalog-layers-loading="catalogLayersLoading"
            @update:base-model-value="emit('update:baseModelValue', $event)"
            @catalog-toggle="setCatalogChecked"
          />
        </div>

        <div
          :id="`ec-tab-panel-${TAB_PANEL_IDS.dataLayers}`"
          class="ec-tab-panels__pane"
          role="tabpanel"
          :hidden="activeTab !== TAB_PANEL_IDS.dataLayers"
          :aria-labelledby="`ec-tab-${TAB_PANEL_IDS.dataLayers}`"
        >
          <DataLayersManagerPanel
            :layers="layers"
            :map-zoom="mapZoom"
            :catalog-entry-in-zoom-range="catalogEntryInZoomRange"
            @visible="setVisible"
            @opacity="setOpacity"
            @toggle-grayscale="toggleGrayscale"
            @remove="removeFromStack"
            @reorder="reorderStackByDisplayIndex"
            @enable-aggregate-detail="enableAggregateDetail"
            @regroup-aggregate="regroupAggregate"
          />
        </div>

        <div
          :id="`ec-tab-panel-${TAB_PANEL_IDS.legends}`"
          class="ec-tab-panels__pane"
          role="tabpanel"
          :hidden="activeTab !== TAB_PANEL_IDS.legends"
          :aria-labelledby="`ec-tab-${TAB_PANEL_IDS.legends}`"
        >
          <LayerLegendsPanel
            :layers="legendLayers"
            :map-zoom="mapZoom"
            :catalog-entry-in-zoom-range="catalogEntryInZoomRange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

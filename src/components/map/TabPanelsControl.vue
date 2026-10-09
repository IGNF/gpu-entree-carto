<script setup lang="ts">
/**
 * Contrôle OpenLayers — panneau latéral à 4 onglets (droite de la carte).
 * Masqué par défaut ; ouverture via onglet ou `showSelection` (localisation).
 */
import {
  computed,
  inject,
  nextTick,
  onMounted,
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
import { applyDocumentCatalogVisibility } from '@/lib/layerConfig/documentCatalogVisibility'
import { initialHashHadLayerPermalinkParams } from '@/lib/layerConfig/documentCatalogStartup'
import { getDemoConfig } from '@/lib/demo/demoConfig'
import config from '@/lib/config'
import type { StandardViewerDocument } from '@/lib/types'
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
import type { TreeLayerNode } from '@/types/treeLayerNode'
import type { GpuBaseLayerId, GpuBaseLayerPreset } from '@/ol/gpuBaseLayerPresets'
import { TAB_PANELS_AUTO_OPEN_SNAP, type TabPanelsSheetSnapIndex } from '@/lib/map/tabPanelsLayout'
import { useTabPanelsLayout } from '@/composables/useTabPanelsLayout'
import { useTabPanelsMobileSheet } from '@/composables/useTabPanelsMobileSheet'
import { useMapViewportControls } from '@/composables/useMapViewportControls'
import { useMobileBottomBarGeopf } from '@/composables/useMobileBottomBarGeopf'
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
/** Overlay carte : panneau contenu (hors `.ol-control`). */
const shellEl = ref<HTMLElement | null>(null)
/** Seul nœud passé à OpenLayers — colonne / barre d’onglets. */
const tabsControlEl = ref<HTMLElement | null>(null)
const mobileSketchSlotEl = ref<HTMLElement | null>(null)
const mobileTerritoriesSlotEl = ref<HTMLElement | null>(null)
const mobileOverviewSlotEl = ref<HTMLElement | null>(null)
let olControl: Control | null = null

const isOpen = ref(false)
const activeTab = ref<number | null>(null)
const selection = ref<FicheInfoSelection | null>(null)

const { layoutMode, refreshLayoutMetrics } = useTabPanelsLayout(shellEl)
const {
  sheetSnapIndex,
  sheetDragPercent,
  sheetFractionPercent,
  openSheetDefault,
  setSheetSnap,
  closeSheet,
  syncSheetCssVars,
  onSheetGrabPointerDown,
  onSheetGrabPointerMove,
  onSheetGrabPointerUp,
} = useTabPanelsMobileSheet(layoutMode, shellEl)

const isBottomLayout = computed(() => layoutMode.value === 'bottom')
const tabListOrientation = computed(() => (isBottomLayout.value ? 'horizontal' : 'vertical'))
const { zoomIn, zoomOut, toggleFullscreen, isFullscreen } = useMapViewportControls()
const { startMobileBottomBarGeopfObserver } = useMobileBottomBarGeopf(
  layoutMode,
  mobileSketchSlotEl,
  mobileOverviewSlotEl,
  mobileTerritoriesSlotEl,
)

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
  syncCatalogCheckedFromTreeVisible,
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

function openTab(index: number, sheetSnap?: TabPanelsSheetSnapIndex) {
  if (index < 0 || index >= tabs.length) return
  activeTab.value = index
  if (layoutMode.value === 'bottom') {
    if (sheetSnap !== undefined) setSheetSnap(sheetSnap)
    else openSheetDefault()
    isOpen.value = sheetSnapIndex.value > 0
  } else {
    isOpen.value = true
  }
}

function closePanels() {
  if (layoutMode.value === 'bottom') closeSheet()
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
  openTab(TAB_PANEL_IDS.fiche, TAB_PANELS_AUTO_OPEN_SNAP)
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
    shellEl.value?.closest('.ec-map-shell')
  if (!(shell instanceof HTMLElement)) return
  shell.classList.toggle('ec-map-shell--tab-panels-open', open)
  refreshLayoutMetrics()
  if (layoutMode.value === 'bottom') {
    syncSheetCssVars(open ? sheetFractionPercent.value : 0)
  }
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

watch(sheetSnapIndex, (idx) => {
  if (layoutMode.value !== 'bottom') return
  if (idx === 0 && isOpen.value) {
    isOpen.value = false
    activeTab.value = null
  }
})

watch(layoutMode, (mode) => {
  refreshLayoutMetrics()
  if (mode === 'side') {
    closeSheet()
    if (isOpen.value) syncShellOpenClass(true)
    return
  }
  if (isOpen.value && activeTab.value !== null) {
    setSheetSnap(TAB_PANELS_AUTO_OPEN_SNAP)
    isOpen.value = true
    syncShellOpenClass(true)
  } else {
    closeSheet()
    syncShellOpenClass(false)
  }
  void nextTick(() => mapRef.value?.updateSize())
})

watch(
  [mapRef, tabsControlEl],
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
  if (parts.length === 1) return parts[0]
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

function resolveDocumentForCatalogStartup(): StandardViewerDocument | null {
  const demoDoc = getDemoConfig().document
  if (demoDoc?.type) return demoDoc
  const injected = config.document
  if (injected && typeof injected === 'object' && 'type' in injected) {
    return injected as StandardViewerDocument
  }
  return null
}

function applyDocumentCatalogFromStartupConfig(): void {
  const doc = resolveDocumentForCatalogStartup()
  if (!doc?.type || !layerNodesRef.value.length) return
  applyDocumentCatalogVisibility(layerNodesRef.value, doc)
  syncCatalogCheckedFromTreeVisible()
  replaceLayerPermalinkParams(collectLayerParamsForPermalink())
}

function applyLayerParamsFromPermalink(params: MapPermalinkParams): void {
  const startupDoc = resolveDocumentForCatalogStartup()
  if (startupDoc?.type && !initialHashHadLayerPermalinkParams()) {
    return
  }
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
    const params = getMapPermalinkParams()
    const startupDoc = resolveDocumentForCatalogStartup()
    if (startupDoc?.type && !initialHashHadLayerPermalinkParams()) {
      applyDocumentCatalogFromStartupConfig()
      return
    }
    if (layerPermalinkEntriesFromParams(params).length) {
      applyLayerParamsFromPermalink(params)
    }
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

onMounted(() => {
  startMobileBottomBarGeopfObserver()
})

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
    ref="shellEl"
    class="ec-tab-panels-shell"
    :class="{ 'is-open': isOpen, 'is-sheet-dragging': sheetDragPercent !== null }"
    :data-ec-tab-panels-layout="layoutMode"
    :style="{ '--ec-tab-panels-sheet-fraction': String(sheetFractionPercent) }"
    role="complementary"
    aria-label="Panneau cartographique"
  >
    <div ref="tabsControlEl" class="ec-tab-panels__tabs-control ol-unselectable ol-control">
      <div
        class="ec-tab-panels__bottom-chrome"
        :class="{ 'ec-tab-panels__bottom-chrome--mobile': isBottomLayout }"
      >
        <div
          v-show="isBottomLayout"
          class="ec-tab-panels__geopf-slots"
          role="group"
          aria-label="Outils carte"
        >
          <div
            ref="mobileSketchSlotEl"
            class="ec-tab-panels__geopf-slot ec-tab-panels__geopf-slot--sketch"
          />
          <div
            ref="mobileOverviewSlotEl"
            class="ec-tab-panels__geopf-slot ec-tab-panels__geopf-slot--overview"
          />
          <div
            ref="mobileTerritoriesSlotEl"
            class="ec-tab-panels__geopf-slot ec-tab-panels__geopf-slot--territories"
          />
        </div>
        <div
          class="ec-tab-panels__tabs"
          role="tablist"
          :aria-orientation="tabListOrientation"
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
      </div>
      <div
        v-show="isBottomLayout"
        class="ec-tab-panels__viewport-stack"
        role="group"
        aria-label="Zoom et plein écran"
      >
        <div class="ec-tab-panels__viewport-stack-zoom">
          <button
            type="button"
            class="ec-tab-panels__viewport-tool ec-tab-panels__viewport-tool--zoom"
            aria-label="Zoom avant"
            @click="zoomIn"
          >
            <span aria-hidden="true">+</span>
          </button>
          <button
            type="button"
            class="ec-tab-panels__viewport-tool ec-tab-panels__viewport-tool--zoom"
            aria-label="Zoom arrière"
            @click="zoomOut"
          >
            <span aria-hidden="true">−</span>
          </button>
        </div>
        <button
          type="button"
          class="ec-tab-panels__viewport-tool ec-tab-panels__viewport-tool--remix"
          :class="isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'"
          :aria-label="isFullscreen ? 'Quitter le plein écran' : 'Plein écran'"
          :aria-pressed="isFullscreen"
          @click="toggleFullscreen"
        />
      </div>
    </div>

    <div class="ec-tab-panels__surface" :class="{ 'ec-tab-panels__surface--visible': isOpen }">
      <div class="ec-tab-panels__panel">
        <div
          v-if="isBottomLayout"
          class="ec-tab-panels__sheet-grab ec-tab-panels__modal-slider"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Slider modale — redimensionner le panneau"
          @pointerdown="onSheetGrabPointerDown"
          @pointermove="onSheetGrabPointerMove"
          @pointerup="onSheetGrabPointerUp"
          @pointercancel="onSheetGrabPointerUp"
        />
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
  </div>
</template>

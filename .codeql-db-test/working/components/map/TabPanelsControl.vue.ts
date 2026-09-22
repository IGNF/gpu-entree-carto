/**
 * Contrôle OpenLayers — panneau latéral à 4 onglets (droite de la carte).
 * Masqué par défaut ; ouverture via onglet ou `showSelection` (localisation).
 */
import { inject, onUnmounted, provide, ref, shallowRef, toRef, watch, type ShallowRef } from 'vue'
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
  }>(),
  {
    basePresets: () => [],
    baseModelValue: 'carte',
    layerNodes: () => [],
    layerMapHooks: undefined,
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
  setVisible,
  setOpacity,
  toggleGrayscale,
  removeFromStack,
  reorderStackByDisplayIndex,
  enableAggregateDetail,
  regroupAggregate,
  notifyStackOrder,
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

onUnmounted(() => {
  syncShellOpenClass(false)
  registerTabPanelsApi(null)
  if (olControl && mapRef.value) {
    mapRef.value.removeControl(olControl)
  }
  olControl = null
})

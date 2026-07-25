<script setup lang="ts">
/**
 * Contrôle OpenLayers — panneau latéral à 4 onglets (droite de la carte).
 * Masqué par défaut ; ouverture via onglet ou `showSelection` (localisation).
 */
import {
  inject,
  onUnmounted,
  provide,
  ref,
  shallowRef,
  watch,
  type ShallowRef,
} from 'vue'
import Control from 'ol/control/Control'
import type Map from 'ol/Map'
import {
  registerTabPanelsApi,
  TAB_PANELS_KEY,
  TAB_PANEL_IDS,
  type FicheInfoSelection,
  type TabPanelsApi,
} from '@/composables/tabPanels'
import FicheInfoPanel from '@/components/panels/FicheInfoPanel.vue'
import RawInfoPanel from '@/components/panels/RawInfoPanel.vue'
import TileLayerSwitcher from '@/components/layers/TileLayerSwitcher.vue'
import TreeLayerSwitcher, {
  type TreeLayerNode,
} from '@/components/layers/TreeLayerSwitcher.vue'
import type { BaseLayerId, BaseLayerPreset } from '@/ol/baseLayers'
import '@/styles/tab-panels.css'

withDefaults(
  defineProps<{
    /** Fonds de plan pour l’onglet couches. */
    basePresets?: BaseLayerPreset[]
    baseModelValue?: BaseLayerId
    /** Nœuds arbre de couches (stub / layerConfig plus tard). */
    layerNodes?: TreeLayerNode[]
  }>(),
  {
    basePresets: () => [],
    baseModelValue: 'plan',
    layerNodes: () => [],
  },
)

const emit = defineEmits<{
  'update:baseModelValue': [id: BaseLayerId]
  'toggle-layer': [id: string, visible: boolean]
}>()

const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
const rootEl = ref<HTMLElement | null>(null)
let olControl: Control | null = null

const isOpen = ref(false)
const activeTab = ref<number | null>(null)
const selection = ref<FicheInfoSelection | null>(null)

const tabs = [
  {
    id: TAB_PANEL_IDS.fiche,
    label: 'Informations / localisation',
    icon: 'fr-icon-map-pin-2-line',
  },
  {
    id: TAB_PANEL_IDS.empty,
    label: 'Onglet réservé',
    icon: 'fr-icon-road-map-line',
  },
  {
    id: TAB_PANEL_IDS.layers,
    label: 'Couches et légende',
    icon: 'fr-icon-layout-grid-line',
  },
  {
    id: TAB_PANEL_IDS.raw,
    label: 'Données brutes',
    icon: 'fr-icon-list-unordered',
  },
] as const

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

    // OpenLayers déplace `element` dans le viewport carte
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
        :class="[tab.icon, { 'is-active': isOpen && activeTab === tab.id }]"
        :aria-selected="isOpen && activeTab === tab.id"
        :aria-controls="`ec-tab-panel-${tab.id}`"
        :aria-label="tab.label"
        @click="onTabClick(tab.id)"
      />
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
          :id="`ec-tab-panel-${TAB_PANEL_IDS.empty}`"
          class="ec-tab-panels__pane"
          role="tabpanel"
          :hidden="activeTab !== TAB_PANEL_IDS.empty"
          :aria-labelledby="`ec-tab-${TAB_PANEL_IDS.empty}`"
        >
          <p class="ec-tab-panels__empty">
            Contenu à venir.
          </p>
        </div>

        <div
          :id="`ec-tab-panel-${TAB_PANEL_IDS.layers}`"
          class="ec-tab-panels__pane"
          role="tabpanel"
          :hidden="activeTab !== TAB_PANEL_IDS.layers"
          :aria-labelledby="`ec-tab-${TAB_PANEL_IDS.layers}`"
        >
          <TileLayerSwitcher
            v-if="basePresets.length"
            :presets="basePresets"
            :model-value="baseModelValue"
            @update:model-value="emit('update:baseModelValue', $event)"
          />
          <TreeLayerSwitcher
            :nodes="layerNodes"
            @toggle="(id, visible) => emit('toggle-layer', id, visible)"
          />
        </div>

        <div
          :id="`ec-tab-panel-${TAB_PANEL_IDS.raw}`"
          class="ec-tab-panels__pane"
          role="tabpanel"
          :hidden="activeTab !== TAB_PANEL_IDS.raw"
          :aria-labelledby="`ec-tab-${TAB_PANEL_IDS.raw}`"
        >
          <RawInfoPanel :selection="selection" />
        </div>
      </div>
    </div>
  </div>
</template>

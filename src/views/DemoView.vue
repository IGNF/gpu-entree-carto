<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import MapShell from '@/components/map/MapShell.vue'
import ZoomControl from '@/components/map/ZoomControl.vue'
import FullScreenControl from '@/components/map/FullScreenControl.vue'
import ScaleLineControl from '@/components/map/ScaleLineControl.vue'
import SearchEngineControl from '@/components/map/SearchEngineControl.vue'
import OverviewMapControl from '@/components/map/OverviewMapControl.vue'
import TerritoriesControl from '@/components/map/TerritoriesControl.vue'
import SketchControl from '@/components/map/SketchControl.vue'
import TabPanelsControl from '@/components/map/TabPanelsControl.vue'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import type { StandardViewerDocument, StandardViewerSearch } from '@/lib/types'
import { takeLocationHandoff } from '@/lib/search/locationSearch'
import { pushRandomLifeNotification } from '@/lib/notifications/cartoNotifications'
import {
  documentToFicheSelection,
  fitMapToBbox,
  getDemoConfig,
  isValidBbox,
  prepareDemoEnvironment,
  resolveDemoBaseLayerId,
  resolveDemoLayerNodes,
} from '@/lib/demo/demoConfig'
import { tabPanelsApiRef } from '@/composables/tabPanels'
import { gpuWmsLayerRegistry } from '@/lib/layerConfig/gpuWmsLayers'
import { readLayerConfigFromWindow } from '@/lib/layerConfig/gpuLayerConfig'
import {
  createGpuBaseLayerEnvironment,
  setActiveGpuBaseLayer,
  type GpuBaseLayerId,
} from '@/ol/gpuBaseLayerPresets'
import 'ol/ol.css'
import 'geopf-extensions-openlayers/css/Dsfr.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@/styles/map-controls.css'

const demoCfg = getDemoConfig()
const gpuBaseEnv = createGpuBaseLayerEnvironment()
const gpuBasePresets = gpuBaseEnv.presets
const activeBase = ref<GpuBaseLayerId>(resolveDemoBaseLayerId(demoCfg))
const mapZoom = ref(demoCfg.map?.zoom ?? 6)
const mapLayers = computed(() => gpuBaseEnv.allLayers)

const handoff = takeLocationHandoff()
const initialSearch = ref<StandardViewerSearch | null>(
  handoff ?? demoCfg.map?.search ?? null,
)
const layerNodes = ref<TreeLayerNode[]>(resolveDemoLayerNodes(demoCfg))
const mapShellRef = ref<InstanceType<typeof MapShell> | null>(null)
const pendingBbox = ref<number[] | null>(
  !handoff && isValidBbox(demoCfg.bbox) ? demoCfg.bbox : null,
)
const pendingDocument = ref<StandardViewerDocument | null>(demoCfg.document ?? null)
const gpuDocument = ref<StandardViewerDocument | null>(demoCfg.document ?? null)

if (gpuBasePresets.some((p) => p.id === activeBase.value)) {
  setActiveGpuBaseLayer(gpuBaseEnv, activeBase.value)
}

const layerMapHooks = {
  onVisible: (id: string, visible: boolean) => gpuWmsLayerRegistry.setVisible(id, visible),
  onOpacity: (id: string, opacity: number) => gpuWmsLayerRegistry.setOpacity(id, opacity),
  onGrayscale: (id: string, grayscale: boolean) => gpuWmsLayerRegistry.setGrayscale(id, grayscale),
  onStackOrder: (ids: string[]) => gpuWmsLayerRegistry.applyStackOrder(ids),
}

onMounted(async () => {
  const cfg = await prepareDemoEnvironment(getDemoConfig())
  gpuDocument.value = cfg.document ?? null
  layerNodes.value = resolveDemoLayerNodes(cfg)
  const layerConfig = readLayerConfigFromWindow()
  if (layerConfig?.length) {
    gpuWmsLayerRegistry.loadFromLayerConfig(layerConfig, gpuDocument.value)
    const map = mapShellRef.value?.map ?? null
    if (map) gpuWmsLayerRegistry.attachMap(map)
  }
})

onUnmounted(() => {
  gpuWmsLayerRegistry.detachMap()
})

watch(
  () => mapShellRef.value?.map ?? null,
  (map) => {
    if (map && readLayerConfigFromWindow()?.length) {
      gpuWmsLayerRegistry.attachMap(map)
    }
  },
)

function applyPendingDocument() {
  const doc = pendingDocument.value
  const api = tabPanelsApiRef.value
  if (!doc || !api) return
  api.showSelection(documentToFicheSelection(doc))
  pendingDocument.value = null
}

watch(tabPanelsApiRef, applyPendingDocument, { immediate: true })

watch(
  () => mapShellRef.value?.map ?? null,
  (map) => {
    const bbox = pendingBbox.value
    if (!map || !bbox) return
    fitMapToBbox(map, bbox)
    pendingBbox.value = null
  },
  { immediate: true },
)

function onUpdateBase(id: GpuBaseLayerId) {
  activeBase.value = id
  setActiveGpuBaseLayer(gpuBaseEnv, id)
}

function onToggleLayer(id: string, visible: boolean) {
  const flat = (nodes: TreeLayerNode[]): TreeLayerNode | undefined => {
    for (const n of nodes) {
      if (n.id === id) return n
      if (n.children?.length) {
        const hit = flat(n.children)
        if (hit) return hit
      }
    }
    return undefined
  }
  const node = flat(layerNodes.value)
  if (node) node.visible = visible
}
</script>

<template>
  <div class="ec-demo-map">
    <button
      type="button"
      class="ec-demo-map__notif-test fr-btn fr-btn--sm fr-btn--secondary"
      title="Déclencher une notification aléatoire"
      @click="pushRandomLifeNotification"
    >
      Notif test
    </button>
    <main class="ec-layout ec-layout--map-only">
      <div class="ec-layout__map">
        <MapShell ref="mapShellRef" :layers="mapLayers" :zoom="mapZoom">
          <TabPanelsControl
            :base-model-value="activeBase"
            :base-presets="gpuBasePresets"
            :layer-nodes="layerNodes"
            :layer-map-hooks="layerMapHooks"
            @update:base-model-value="onUpdateBase"
            @toggle-layer="onToggleLayer"
          />
          <SearchEngineControl :initial-search="initialSearch" />
          <OverviewMapControl />
          <SketchControl />
          <TerritoriesControl />
          <ZoomControl />
          <FullScreenControl />
          <ScaleLineControl />
        </MapShell>
      </div>
    </main>
  </div>
</template>

<style scoped>
.ec-demo-map {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.ec-layout {
  flex: 1;
  min-height: 0;
  height: auto;
}

.ec-demo-map__notif-test {
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 10000;
  box-shadow: var(--raised-shadow, 0 2px 6px rgba(0, 0, 18, 0.16));
}
</style>

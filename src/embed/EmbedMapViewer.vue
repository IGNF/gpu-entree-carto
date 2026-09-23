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
import {
  createGpuBaseLayerEnvironment,
  setActiveGpuBaseLayer,
  type GpuBaseLayerId,
} from '@/ol/gpuBaseLayerPresets'
import type { StandardViewerParams } from '@/lib/types'
import { syncEntreeConfigFromGpuScript } from '@/lib/demo/demoConfig'
import { resolveLayerConfig } from '@/lib/layerConfig/gpuLayerConfig'
import { layerConfigToTreeNodes } from '@/lib/layerConfig/layerConfigToTree'
import { gpuWmsLayerRegistry } from '@/lib/layerConfig/gpuWmsLayers'
import 'ol/ol.css'
import 'geopf-extensions-openlayers/css/Dsfr.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@/styles/map-controls.css'

const props = defineProps<{
  params?: StandardViewerParams
}>()

const gpuBaseEnv = createGpuBaseLayerEnvironment()
const presets = gpuBaseEnv.presets
const activeBase = ref<GpuBaseLayerId>('carte')
setActiveGpuBaseLayer(gpuBaseEnv, activeBase.value)
const baseLayers = computed(() => gpuBaseEnv.allLayers)
const initialSearch = computed(() => props.params?.search ?? null)

const mapShellRef = ref<InstanceType<typeof MapShell> | null>(null)
const layerNodes = ref<TreeLayerNode[]>([])

const layerMapHooks = {
  onVisible: (id: string, visible: boolean) => gpuWmsLayerRegistry.setVisible(id, visible),
  onOpacity: (id: string, opacity: number) => gpuWmsLayerRegistry.setOpacity(id, opacity),
  onGrayscale: (id: string, grayscale: boolean) => gpuWmsLayerRegistry.setGrayscale(id, grayscale),
  onStackOrder: (ids: string[]) => gpuWmsLayerRegistry.applyStackOrder(ids),
}

function currentMapZoom(): number {
  const z = mapShellRef.value?.map?.getView().getZoom()
  return typeof z === 'number' && Number.isFinite(z) ? Math.round(z) : 6
}

function initLayerStack(): void {
  syncEntreeConfigFromGpuScript()
  const layerConfig = resolveLayerConfig(props.params?.layerConfig)
  if (!layerConfig?.length) {
    layerNodes.value = []
    gpuWmsLayerRegistry.detachMap()
    return
  }
  layerNodes.value = layerConfigToTreeNodes(layerConfig, currentMapZoom())
  gpuWmsLayerRegistry.loadFromLayerConfig(layerConfig, props.params?.document ?? null)
  const map = mapShellRef.value?.map ?? null
  if (map) {
    gpuWmsLayerRegistry.attachMap(map)
  }
}

onMounted(() => {
  initLayerStack()
})

onUnmounted(() => {
  gpuWmsLayerRegistry.detachMap()
})

watch(
  () => mapShellRef.value?.map ?? null,
  (map) => {
    if (map && resolveLayerConfig(props.params?.layerConfig)?.length) {
      gpuWmsLayerRegistry.attachMap(map)
    }
  },
)

watch(
  () => props.params?.document,
  () => {
    initLayerStack()
  },
)

function onUpdateBase(id: GpuBaseLayerId) {
  activeBase.value = id
  setActiveGpuBaseLayer(gpuBaseEnv, id)
}

function findLayerNode(nodes: TreeLayerNode[], id: string): TreeLayerNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children?.length) {
      const hit = findLayerNode(n.children, id)
      if (hit) return hit
    }
  }
  return undefined
}

function onToggleLayer(id: string, visible: boolean) {
  const node = findLayerNode(layerNodes.value, id)
  if (node) node.visible = visible
}
</script>

<template>
  <div class="ec-embed-viewer gpu-client" data-testid="embed-map-viewer">
    <MapShell ref="mapShellRef" :layers="baseLayers" class="ec-embed-viewer__map">
      <TabPanelsControl
        v-model:base-model-value="activeBase"
        :base-presets="presets"
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
</template>

<style scoped>
.ec-embed-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.ec-embed-viewer__map {
  width: 100%;
  height: 100%;
}
</style>

<style>
.ec-embed-viewer .ec-map-shell,
.ec-embed-viewer .ec-map-shell__map,
.ec-embed-viewer #gpu-map {
  width: 100%;
  height: 100%;
}

.ec-embed-viewer .ec-map-shell {
  container-type: size;
  container-name: map;
}
</style>

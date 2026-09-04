<script setup lang="ts">
import { computed, ref } from 'vue'
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
import { createBaseLayerPresets, type BaseLayerId } from '@/ol/baseLayers'
import type { StandardViewerParams } from '@/lib/types'
import 'ol/ol.css'
import 'geopf-extensions-openlayers/css/Dsfr.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@/styles/map-controls.css'

const props = defineProps<{
  params?: StandardViewerParams
}>()

const presets = createBaseLayerPresets()
const activeBase = ref<BaseLayerId>('plan')
const baseLayers = computed(() => presets.map((p) => p.layer))
const initialSearch = computed(() => props.params?.search ?? null)

/** Stub jusqu’à consommation de layerConfig / legendConfig. */
const layerNodes = ref<TreeLayerNode[]>([])

function onToggleLayer(id: string, visible: boolean) {
  const node = layerNodes.value.find((n) => n.id === id)
  if (node) node.visible = visible
}
</script>

<template>
  <div class="ec-embed-viewer gpu-client" data-testid="embed-map-viewer">
    <MapShell :layers="baseLayers" class="ec-embed-viewer__map">
      <TabPanelsControl
        v-model:base-model-value="activeBase"
        :base-presets="presets"
        :layer-nodes="layerNodes"
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

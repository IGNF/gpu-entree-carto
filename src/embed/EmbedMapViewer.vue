<script setup lang="ts">
import { computed } from 'vue'
import MapShell from '@/components/map/MapShell.vue'
import ZoomControl from '@/components/map/ZoomControl.vue'
import FullScreenControl from '@/components/map/FullScreenControl.vue'
import ScaleLineControl from '@/components/map/ScaleLineControl.vue'
import SearchEngineControl from '@/components/map/SearchEngineControl.vue'
import SearchAtInit from '@/components/map/SearchAtInit.vue'
import OverviewMapControl from '@/components/map/OverviewMapControl.vue'
import TerritoriesControl from '@/components/map/TerritoriesControl.vue'
import { createBaseLayerPresets } from '@/ol/baseLayers'
import type { StandardViewerParams } from '@/lib/types'
import 'ol/ol.css'
import 'geopf-extensions-openlayers/css/Dsfr.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@/styles/map-controls.css'

defineProps<{
  params?: StandardViewerParams
}>()

const presets = createBaseLayerPresets()
const baseLayers = computed(() => presets.map((p) => p.layer))
</script>

<template>
  <div class="ec-embed-viewer gpu-client" data-testid="embed-map-viewer">
    <MapShell :layers="baseLayers" class="ec-embed-viewer__map">
      <SearchEngineControl />
      <SearchAtInit :search="params?.search" />
      <OverviewMapControl />
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

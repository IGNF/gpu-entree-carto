<script setup lang="ts">
import { computed } from 'vue'
import MapShell from '@/components/map/MapShell.vue'
import ZoomControl from '@/components/map/ZoomControl.vue'
import FullScreenControl from '@/components/map/FullScreenControl.vue'
import ScaleLineControl from '@/components/map/ScaleLineControl.vue'
import { createBaseLayerPresets } from '@/ol/baseLayers'
import type { StandardViewerParams } from '@/lib/types'
import 'ol/ol.css'
import 'geopf-extensions-openlayers/css/Dsfr.css'
import '@/styles/map-controls.css'

const props = defineProps<{
  params?: StandardViewerParams
}>()

const searchHint = computed(() => props.params?.search?.fullText ?? '')

const presets = createBaseLayerPresets()
const baseLayers = computed(() => presets.map((p) => p.layer))
</script>

<template>
  <div class="ec-embed-viewer gpu-client" data-testid="embed-map-viewer">
    <MapShell :layers="baseLayers" class="ec-embed-viewer__map">
      <ZoomControl />
      <FullScreenControl />
      <ScaleLineControl />
    </MapShell>
    <p
      v-if="searchHint"
      class="ec-embed-viewer__hint fr-text--xs fr-hint-text"
    >
      Recherche reçue : {{ searchHint }} (centrage à venir).
    </p>
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

.ec-embed-viewer__hint {
  position: absolute;
  left: 0.5rem;
  top: 0.5rem;
  z-index: 2;
  margin: 0;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.9);
}
</style>

<style>
/* Compatibilité gpu-site : #gpu-map { height: 726px } dans gpu-map.css */
.ec-embed-viewer .ec-map-shell__map,
.ec-embed-viewer #gpu-map {
  width: 100%;
  height: 100%;
}
</style>

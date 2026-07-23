<script setup lang="ts">
import { inject, onUnmounted, shallowRef, watch, type ShallowRef } from 'vue'
import type Map from 'ol/Map'
import Zoom from 'ol/control/Zoom'

const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
let control: Zoom | null = null

watch(
  mapRef,
  (map) => {
    if (!map) return
    control = new Zoom({
      zoomInLabel: '+',
      zoomOutLabel: '−',
      zoomInTipLabel: 'Zoom avant',
      zoomOutTipLabel: 'Zoom arrière',
    })
    map.addControl(control)
  },
  { immediate: true },
)

onUnmounted(() => {
  if (control && mapRef.value) {
    mapRef.value.removeControl(control)
  }
  control = null
})
</script>

<template>
  <!-- Contrôle natif OpenLayers (DOM géré par OL) -->
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>

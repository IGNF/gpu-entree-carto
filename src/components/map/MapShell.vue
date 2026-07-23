<script setup lang="ts">
import { provide, ref, shallowRef, watch } from 'vue'
import type Map from 'ol/Map'
import type BaseLayer from 'ol/layer/Base'
import { useOlMap } from '@/composables/useOlMap'

const props = withDefaults(
  defineProps<{
    layers?: BaseLayer[]
    zoom?: number
  }>(),
  {
    layers: () => [],
    zoom: 6,
  },
)

const mapEl = ref<HTMLElement | null>(null)
const { map } = useOlMap({
  target: mapEl,
  layers: props.layers,
  zoom: props.zoom,
})

/** Expose la carte aux contrôles enfants (injection). */
const mapRef = shallowRef<Map | null>(null)
provide('olMap', mapRef)

watch(
  map,
  (value) => {
    mapRef.value = value
  },
  { immediate: true },
)

defineExpose({ map })
</script>

<template>
  <div class="ec-map-shell" data-testid="map-shell">
    <div
      id="gpu-map"
      ref="mapEl"
      class="ec-map-shell__map"
      role="application"
      aria-label="Carte"
    />
    <slot :map="map" />
  </div>
</template>

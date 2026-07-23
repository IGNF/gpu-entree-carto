<script setup lang="ts">
/**
 * Applique un résultat de recherche (params.search) : centrage + marqueur.
 */
import { inject, onUnmounted, shallowRef, watch, type ShallowRef } from 'vue'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import type Map from 'ol/Map'
import type { StandardViewerSearch } from '@/lib/types'
import { applySearchToMap } from '@/lib/search/locationSearch'

const props = defineProps<{
  search?: StandardViewerSearch | null
}>()

const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
let markerLayer: VectorLayer<VectorSource> | null = null

function clearMarker(map: Map | null) {
  if (markerLayer && map) {
    map.removeLayer(markerLayer)
  }
  markerLayer = null
}

function showMarker(map: Map, search: StandardViewerSearch) {
  const x = Number(search.position?.x)
  const y = Number(search.position?.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return

  clearMarker(map)
  const feature = new Feature({
    geometry: new Point(fromLonLat([x, y], map.getView().getProjection())),
  })
  markerLayer = new VectorLayer({
    source: new VectorSource({ features: [feature] }),
    style: new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: '#e1000f' }),
        stroke: new Stroke({ color: '#fff', width: 2 }),
      }),
    }),
    zIndex: 1000,
  })
  map.addLayer(markerLayer)
}

watch(
  [mapRef, () => props.search],
  ([map, search]) => {
    if (!map || !search?.fullText) return
    applySearchToMap(map, search)
    showMarker(map, search)
  },
  { immediate: true },
)

onUnmounted(() => {
  clearMarker(mapRef.value)
})
</script>

<template>
  <span class="ec-search-at-init-host" hidden aria-hidden="true" />
</template>

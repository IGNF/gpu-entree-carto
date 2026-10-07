<script setup lang="ts">
/**
 * Plein écran Géoplateforme (geopf GeoportalFullScreen).
 * Position par défaut : bottom-right (cartes.gouv.fr / explorer-les-cartes).
 * `source` = `.ec-map-shell` pour garder le panneau latéral en plein écran.
 */
import { inject, shallowRef, type ShallowRef } from 'vue'
import type Map from 'ol/Map'
import { useOlControl } from '@/composables/useOlControl'
import { getMapShellFullscreenElement } from '@/composables/useMapViewportControls'
import { CONTROL_POSITIONS, type GeopfControlPosition } from '@/map/controlPositions'
import GeoportalFullScreen from 'geopf-extensions-openlayers/src/packages/Controls/FullScreen/GeoportalFullScreen.js'

const props = withDefaults(
  defineProps<{
    position?: GeopfControlPosition
  }>(),
  {
    position: CONTROL_POSITIONS.fullscreen,
  },
)

const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))

useOlControl(() => {
  const source = getMapShellFullscreenElement(mapRef.value)
  return new GeoportalFullScreen({
    position: props.position,
    tipLabel: 'Plein écran',
    ...(source ? { source } : {}),
  })
})
</script>

<template>
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>

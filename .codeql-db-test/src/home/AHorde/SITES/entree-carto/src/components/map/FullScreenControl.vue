<script setup lang="ts">
/**
 * Plein écran Géoplateforme (geopf GeoportalFullScreen).
 * Position par défaut : bottom-right (cartes.gouv.fr / explorer-les-cartes).
 */
import { useOlControl } from '@/composables/useOlControl'
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

useOlControl(
  () =>
    new GeoportalFullScreen({
      position: props.position,
      tipLabel: 'Plein écran',
    }),
)
</script>

<template>
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>

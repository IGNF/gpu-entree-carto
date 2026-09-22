<script setup lang="ts">
/**
 * Zoom Géoplateforme (geopf GeoportalZoom).
 * Position par défaut : bottom-right (cartes.gouv.fr / explorer-les-cartes).
 */
import { useOlControl } from '@/composables/useOlControl'
import { CONTROL_POSITIONS, type GeopfControlPosition } from '@/map/controlPositions'
import GeoportalZoom from 'geopf-extensions-openlayers/src/packages/Controls/Zoom/GeoportalZoom.js'

const props = withDefaults(
  defineProps<{
    position?: GeopfControlPosition
  }>(),
  {
    position: CONTROL_POSITIONS.zoom,
  },
)

useOlControl(
  () =>
    new GeoportalZoom({
      position: props.position,
      zoomInTipLabel: 'Zoom avant',
      zoomOutTipLabel: 'Zoom arrière',
    }),
)
</script>

<template>
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>

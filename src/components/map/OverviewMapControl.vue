<script setup lang="ts">
/**
 * Minimap Géoplateforme (GeoportalOverviewMap).
 * Placement : bottom-left, au-dessus du sélecteur de territoire (order: -1).
 */
import { useOlControl } from '@/composables/useOlControl'
import { CONTROL_POSITIONS, type GeopfControlPosition } from '@/map/controlPositions'
import GeoportalOverviewMap from 'geopf-extensions-openlayers/src/packages/Controls/OverviewMap/GeoportalOverviewMap.js'

const props = withDefaults(
  defineProps<{
    position?: GeopfControlPosition
    collapsed?: boolean
  }>(),
  {
    position: CONTROL_POSITIONS.overviewMap,
    collapsed: true,
  },
)

useOlControl(
  () =>
    new GeoportalOverviewMap({
      position: props.position,
      collapsed: props.collapsed,
      tipLabel: 'Mini-carte',
    }),
)
</script>

<template>
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>

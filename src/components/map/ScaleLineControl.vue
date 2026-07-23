<script setup lang="ts">
/**
 * Barre d'échelle OpenLayers (ScaleLine), style ol-scale-line + fond DSFR.
 * Placement bas-droite comme sur https://cartes.gouv.fr/explorer-les-cartes/
 * (cf. ScaleLine.vue IGNF — right: widget-panel-x).
 */
import { useOlControl } from '@/composables/useOlControl'
import ScaleLine from 'ol/control/ScaleLine'

useOlControl(
  () =>
    new ScaleLine({
      units: 'metric',
    }),
)
</script>

<template>
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>

<script setup lang="ts">
/**
 * Barre d'échelle alignée sur le composant Figma « Echelle » (node 715:24047).
 * Maquette : fond blanc 85 %, trait en U (gauche / bas / droite), libellé Marianne Bold 11px.
 */
import { inject, onUnmounted, shallowRef, watch, type ShallowRef } from 'vue'
import type Map from 'ol/Map'
import ScaleLine from 'ol/control/ScaleLine'

const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
let control: ScaleLine | null = null

watch(
  mapRef,
  (map) => {
    if (!map) return
    control = new ScaleLine({
      units: 'metric',
      className: 'ec-scale-line',
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
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>

<style>
/* Styles globaux : le DOM du ScaleLine est injecté hors du SFC */
.ec-scale-line {
  /* Figma « W.D Bas / Echelle » : bas-droite de la carte */
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  left: auto;
  z-index: 1;
  background: rgba(255, 255, 255, 0.85);
  padding: 4px;
  pointer-events: none;
}

.ec-scale-line-inner {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 67px;
  height: 14px;
  padding: 0 20px 4px;
  border: solid #000;
  border-width: 0 1px 1px;
  color: #000;
  font-family: Marianne, arial, sans-serif;
  font-weight: 700;
  font-size: 11px;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
}
</style>

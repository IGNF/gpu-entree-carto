<script setup lang="ts">
/**
 * Impression carte (modale cartes.gouv) — bouton geopf bottom-left entre croquis et minimap.
 */
import { inject } from 'vue'
import Control from 'ol/control/Control'
import type Map from 'ol/Map'
import { useOlControl } from '@/composables/useOlControl'
import { CONTROL_POSITIONS } from '@/map/controlPositions'
import { placeElementInGeopfContainer } from '@/map/geopfControlPlacement'
import { mapPrintModalKey } from '@/map/mapPrintModalContext'

const printModal = inject(mapPrintModalKey, null)

class MapPrintOlControl extends Control {
  constructor(onOpen: () => void) {
    const root = document.createElement('div')
    root.className = 'gpf-widget-button ec-map-print-control ol-unselectable'
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'gpf-btn-icon fr-icon-printer-line'
    button.setAttribute('aria-label', 'Imprimer la carte')
    button.title = 'Imprimer la carte'
    const openModal = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      window.setTimeout(() => onOpen(), 0)
    }
    button.addEventListener('click', openModal)
    button.addEventListener('pointerdown', (event) => {
      event.stopPropagation()
    })
    button.addEventListener('mousedown', (event) => {
      event.stopPropagation()
    })
    root.appendChild(button)
    super({ element: root })
  }

  override setMap(map: Map | null): void {
    super.setMap(map)
    if (map) {
      placeElementInGeopfContainer(map, this.element as HTMLElement, CONTROL_POSITIONS.mapPrint)
    }
  }
}

function openPrintModal(): void {
  printModal?.open()
}

useOlControl(() => new MapPrintOlControl(openPrintModal))
</script>

<template>
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>

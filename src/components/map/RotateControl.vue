<script setup lang="ts">
/**
 * Boussole (comme gpu-client `ol-rotate-north`) : toujours visible, l’aiguille suit l’orientation de la
 * carte ; un clic remet le nord en haut, un second clic rend l’orientation précédente. Ordinateur : avec le zoom (bas droite), au-dessus de +/−.
 * Mobile : bouton équivalent dans la pile zoom / plein écran du panneau (`TabPanelsControl`).
 */
import { inject, shallowRef, watch, type ShallowRef } from 'vue'
import Control from 'ol/control/Control'
import type Map from 'ol/Map'
import { useMapRotation } from '@/composables/useMapRotation'
import '@/assets/custom-icons/custom-remix-icons.css'
import { useOlControl } from '@/composables/useOlControl'
import { CONTROL_POSITIONS } from '@/map/controlPositions'
import { placeElementInGeopfContainer } from '@/map/geopfControlPlacement'

const LABEL = 'Réorienter la carte vers le nord'
const RESTORE_LABEL = 'Revenir à l’orientation précédente'

const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
const { rotation, canRestore, toggleNorth } = useMapRotation(mapRef)

class RotateNorthOlControl extends Control {
  readonly icon: HTMLElement
  readonly button: HTMLButtonElement

  constructor() {
    const root = document.createElement('div')
    // `gpf-widget` : info-bulle Géoplateforme au survol (tirée de `aria-label`), comme zoom et plein écran.
    root.className = 'GPwidget gpf-widget gpf-widget-button ec-rotate-control ol-unselectable'
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'gpf-btn-icon ec-rotate-control__btn'
    button.setAttribute('aria-label', LABEL)
    const icon = document.createElement('span')
    icon.className = 'ec-icon-compass-north ec-rotate-control__icon'
    icon.setAttribute('aria-hidden', 'true')
    button.appendChild(icon)
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      toggleNorth()
    })
    root.appendChild(button)
    super({ element: root })
    this.icon = icon
    this.button = button
  }

  override setMap(map: Map | null): void {
    super.setMap(map)
    if (map) {
      placeElementInGeopfContainer(map, this.element as HTMLElement, CONTROL_POSITIONS.rotate)
    }
  }
}

const control = useOlControl(() => new RotateNorthOlControl())

watch(
  [rotation, canRestore, control],
  ([angle, restore, current]) => {
    if (current instanceof RotateNorthOlControl) {
      current.icon.style.transform = `rotate(${angle}rad)`
      const label = restore ? RESTORE_LABEL : LABEL
      current.button.setAttribute('aria-label', label)
    }
  },
  { immediate: true },
)
</script>

<template>
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>

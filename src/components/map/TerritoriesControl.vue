<script setup lang="ts">
/**
 * Sélecteur de territoire Géoplateforme (Territories).
 * Placement : bottom-left (sous la minimap), comme cartes.gouv.fr.
 */
import type Control from 'ol/control/Control'
import { useOlControl } from '@/composables/useOlControl'
import { CONTROL_POSITIONS, type GeopfControlPosition } from '@/map/controlPositions'
import Territories from 'geopf-extensions-openlayers/src/packages/Controls/Territories/Territories.js'

const PANEL_TITLE = 'Sélectionner un territoire'

const props = withDefaults(
  defineProps<{
    position?: GeopfControlPosition
    collapsed?: boolean
    /** Charge la liste par défaut des territoires geopf. */
    auto?: boolean
    /** Active le menu « Modifier les territoires ». */
    viewActive?: boolean
  }>(),
  {
    position: CONTROL_POSITIONS.territories,
    collapsed: true,
    auto: true,
    viewActive: true,
  },
)

/**
 * Geopf hardcode « Sélecteur de territoires » dans le header et un close
 * `fr-icon-close-line` : on aligne sur l’UI cartes.gouv / options.title.
 */
function patchTerritoriesPanel(control: Control): void {
  const root = (control as Control & { element: HTMLElement }).element
  if (!root) return

  const title = root.querySelector<HTMLElement>(
    '.gpf-panel__header .GPpanelTitle, .gpf-panel__header .gpf-panel__title',
  )
  if (title) title.textContent = PANEL_TITLE

  const btn = root.querySelector<HTMLButtonElement>(
    '.gpf-panel__header button.GPpanelClose, .GPpanelHeader button.GPpanelClose',
  )
  if (!btn) return

  btn.id = 'GPterritoriesPanelClose'
  btn.className = 'gpf-btn gpf-btn-icon-close fr-btn--close fr-btn fr-btn--tertiary-no-outline'
  btn.title = 'Fermer le panneau'
  btn.removeAttribute('style')
  btn.replaceChildren()
  const span = document.createElement('span')
  span.className = 'GPelementHidden gpf-visible'
  span.textContent = 'Fermer'
  btn.appendChild(span)
}

useOlControl(
  () =>
    new Territories({
      position: props.position,
      collapsed: props.collapsed,
      auto: props.auto,
      panel: true,
      title: PANEL_TITLE,
      thumbnail: false,
      reduce: false,
      tiles: 3,
      view: {
        active: props.viewActive,
        title: 'Modifier les territoires',
        description: 'Modifier la vue',
      },
    }),
  { afterCreate: patchTerritoriesPanel },
)
</script>

<template>
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>

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
 * Geopf hardcode « Sélecteur de territoires » dans le header : on aligne titre /
 * bouton fermer (`gpf-btn-icon-close`, sans `fr-icon-close-line` — cf. map-controls.css).
 */
function patchTerritoriesPanel(control: Control): void {
  const root = (control as Control & { element: HTMLElement }).element
  if (!root) return

  const panel = root.querySelector<HTMLDialogElement>('dialog[id^="GPterritoriesPanel"]')

  const title = root.querySelector<HTMLElement>(
    '.gpf-panel__header .GPpanelTitle, .gpf-panel__header .gpf-panel__title',
  )
  if (title) {
    title.textContent = PANEL_TITLE
    if (panel) {
      const titleId = `${panel.id}-title`
      title.id = titleId
      panel.setAttribute('aria-labelledby', titleId)
    }
  } else if (panel) {
    panel.setAttribute('aria-label', PANEL_TITLE)
  }

  const closeBtn = root.querySelector<HTMLButtonElement>(
    '.gpf-panel__header button.GPpanelClose, .GPpanelHeader button.GPpanelClose',
  )
  if (closeBtn) {
    patchTerritoriesPanelClose(closeBtn)
  }

  patchTerritoriesMenuViewsBandButtons(root)
}

/** geopf pose `gpf-btn-icon` (40×40 + ::after) sur un bouton libellé — on garde le bandeau texte. */
function patchTerritoriesMenuViewsBandButtons(root: HTMLElement): void {
  const open = root.querySelector<HTMLButtonElement>('#gpf-territories-button-open-views-id')
  if (open && open.dataset.ecTerritoriesBandBtn !== '1') {
    open.dataset.ecTerritoriesBandBtn = '1'
    open.classList.remove('gpf-btn-icon')
  }
}

function patchTerritoriesPanelClose(btn: HTMLButtonElement): void {
  btn.id = 'GPterritoriesPanelClose'
  /* Pas de `fr-icon-close-line` : map-controls.css neutralise le ::after geopf des `.gpf-btn.fr-icon-*`. */
  btn.className = 'gpf-btn gpf-btn-icon-close fr-btn--close fr-btn fr-btn--tertiary-no-outline'
  btn.title = 'Fermer le panneau'
  btn.removeAttribute('style')
  btn.replaceChildren()
  const span = document.createElement('span')
  span.className = 'fr-sr-only'
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
      tiles: 4,
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

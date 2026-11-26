<script setup lang="ts">
/**
 * Clic info (désactivé pendant l’usage des outils croquis : dessin, modification, suppression, mesure, texte…).
 * Remplit l’onglet fiche selon le mode Parcelle / Territoire.
 * `toggleable` : bouton carte pour activer / désactiver le clic (actif au départ).
 */
import { inject, onUnmounted, ref, shallowRef, watch, type ShallowRef } from 'vue'
import Control from 'ol/control/Control'
import type Map from 'ol/Map'
import type MapBrowserEvent from 'ol/MapBrowserEvent'
import type { EventsKey } from 'ol/events'
import { unByKey } from 'ol/Observable'
import { toLonLat } from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import { sketchToolEngagedRef } from '@/composables/sketchToolEngaged'
import { tryUseMapMode } from '@/composables/mapMode'
import { useOlControl } from '@/composables/useOlControl'
import { queryFicheAtMapPoint } from '@/lib/fiche/queryFicheAtMapPoint'

const props = withDefaults(defineProps<{ toggleable?: boolean }>(), { toggleable: false })

const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
const mapMode = tryUseMapMode()
const enabled = ref(true)

const TOGGLE_LABEL_ON = 'Désactiver l’interrogation au clic sur la carte'
const TOGGLE_LABEL_OFF = 'Activer l’interrogation au clic sur la carte'

/**
 * Bouton carte : active / désactive le clic info. Placement OL par défaut (couche des contrôles), positionné
 * en CSS sous la barre de recherche (`click-info.css`).
 */
class ClickInfoToggleOlControl extends Control {
  readonly button: HTMLButtonElement

  constructor(onToggle: () => void) {
    const root = document.createElement('div')
    root.className = 'gpf-widget-button ec-click-info-toggle ol-unselectable'
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'gpf-btn-icon fr-icon-information-line ec-click-info-toggle__btn'
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      onToggle()
    })
    root.appendChild(button)
    super({ element: root })
    this.button = button
  }
}

function syncToggleButton(control: Control | null): void {
  if (!(control instanceof ClickInfoToggleOlControl)) return
  const label = enabled.value ? TOGGLE_LABEL_ON : TOGGLE_LABEL_OFF
  control.button.setAttribute('aria-pressed', String(enabled.value))
  control.button.setAttribute('aria-label', label)
  control.button.title = label
}

const toggleControl = props.toggleable
  ? useOlControl(
      () =>
        new ClickInfoToggleOlControl(() => {
          enabled.value = !enabled.value
        }),
      { afterCreate: syncToggleButton },
    )
  : null

let clickKey: EventsKey | null = null
let shellEl: HTMLElement | null = null

function mapShellFromMap(map: Map): HTMLElement | null {
  const target = map.getTargetElement()
  return target?.closest('.ec-map-shell') ?? null
}

function isSketchLayer(layer: unknown): boolean {
  if (!(layer instanceof VectorLayer)) return false
  return Boolean(layer.get('ec-sketch') || layer.get('ec-measure'))
}

function shouldIgnoreClick(evt: MapBrowserEvent): boolean {
  if (evt.dragging || sketchToolEngagedRef.value) return true
  const orig = evt.originalEvent.target
  if (!(orig instanceof Node)) return false
  if (
    orig instanceof Element &&
    orig.closest(
      '.ec-tab-panels-shell, .ec-tab-panels__tabs-control, .gpf-widget, .ec-map-mode-selector, .ec-sketch-control, .ec-geometry-editor__tools-root, button, a, input, label, select, textarea',
    )
  ) {
    return true
  }
  const map = mapRef.value
  if (!map) return true
  const hits = map.getFeaturesAtPixel(evt.pixel, {
    hitTolerance: 5,
    layerFilter: (layer) => isSketchLayer(layer),
  })
  return hits.length > 0
}

/** `singleclick` OpenLayers = relâchement sans glisser — cerise immédiate, fiche en async. */
function onMapClick(evt: MapBrowserEvent): void {
  if (shouldIgnoreClick(evt)) return
  const map = mapRef.value
  if (!map || !mapMode) return
  const [lon, lat] = toLonLat(evt.coordinate)
  queryFicheAtMapPoint({ lon, lat, mode: mapMode.mode.value, zoom: map.getView().getZoom() ?? 6 })
}

function syncCursor(map: Map | null): void {
  const nextShell = map ? mapShellFromMap(map) : null
  if (shellEl && shellEl !== nextShell) {
    shellEl.classList.remove('ec-map-shell--click-info')
    shellEl = null
  }
  if (!map || !nextShell) return
  shellEl = nextShell
  shellEl.classList.toggle('ec-map-shell--click-info', !sketchToolEngagedRef.value)
}

function bindMap(map: Map): void {
  unbindMap()
  clickKey = map.on('singleclick', onMapClick)
  syncCursor(map)
}

function unbindMap(): void {
  if (clickKey) {
    unByKey(clickKey)
    clickKey = null
  }
  shellEl?.classList.remove('ec-map-shell--click-info')
  shellEl = null
}

watch(
  [mapRef, enabled],
  ([map, on]) => {
    unbindMap()
    if (map && on) bindMap(map)
    syncToggleButton(toggleControl?.value ?? null)
  },
  { immediate: true },
)

watch(sketchToolEngagedRef, () => {
  syncCursor(mapRef.value)
})

onUnmounted(() => {
  unbindMap()
})
</script>

<template>
  <span class="ec-click-info-host" hidden aria-hidden="true" />
</template>

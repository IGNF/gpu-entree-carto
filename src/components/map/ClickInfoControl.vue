<script setup lang="ts">
/**
 * Clic info permanent (désactivé pendant l’usage des outils croquis : dessin, modification, suppression, mesure, texte…).
 * Remplit l’onglet fiche selon le mode Parcelle / Territoire.
 */
import { inject, onUnmounted, shallowRef, watch, type ShallowRef } from 'vue'
import type Map from 'ol/Map'
import type MapBrowserEvent from 'ol/MapBrowserEvent'
import type { EventsKey } from 'ol/events'
import { unByKey } from 'ol/Observable'
import { toLonLat } from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import { sketchToolEngagedRef } from '@/composables/sketchToolEngaged'
import { tryUseMapMode } from '@/composables/mapMode'
import { showMapLocationMarker } from '@/composables/mapLocationMarker'
import { loadFicheForMapPoint } from '@/lib/fiche/ficheInfoService'
import {
  empriseTargetKeyForPoint,
  ensureModeEmpriseForMapPoint,
} from '@/lib/map/searchResultGraphics'

const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
const mapMode = tryUseMapMode()

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
      '.ec-tab-panels, .gpf-widget, .ec-map-mode-selector, .ec-sketch-control, .ec-geometry-editor__tools-root, button, a, input, label, select, textarea',
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
  const zoom = map.getView().getZoom() ?? 6
  const empriseKey = empriseTargetKeyForPoint(lon, lat)
  showMapLocationMarker(lon, lat, {
    label: '',
    origin: 'ficheInfo',
    center: false,
  })
  ensureModeEmpriseForMapPoint(lon, lat, mapMode.mode.value, empriseKey)
  void loadFicheForMapPoint({
    lon,
    lat,
    mode: mapMode.mode.value,
    zoom,
    markerPlacedAtClick: true,
  })
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
  mapRef,
  (map) => {
    unbindMap()
    if (map) bindMap(map)
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

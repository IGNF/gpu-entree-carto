<script setup lang="ts">
/**
 * Sync permalink gpu-client (#lon, lat, z, tile, mlon, mlat, clés couches).
 */
import { inject, onUnmounted, shallowRef, watch, type ShallowRef } from 'vue'
import type Map from 'ol/Map'
import type { EventsKey } from 'ol/events'
import { unByKey } from 'ol/Observable'
import { fromLonLat, toLonLat } from 'ol/proj'
import {
  flushMapPermalinkHashNow,
  getMapPermalinkParams,
  bootstrapMapPermalinkFromLocation,
  initMapPermalinkFromLocation,
  locationHashLooksLikeMapPermalink,
  readMapPermalinkCenter,
  readMapPermalinkMarker,
  readMapPermalinkTileIndex,
  layerPermalinkEntriesFromParams,
  readMapPermalinkZoom,
  updateMapPermalinkParam,
} from '@/lib/map/mapPermalink'
import {
  baseIdFromTileIndex,
  tileIndexFromBaseId,
  useMapPermalinkUi,
} from '@/composables/mapPermalinkUi'
import { mapPermalinkLayersBridgeRef } from '@/composables/mapPermalinkLayersBridge'
import { showMapLocationMarker } from '@/composables/mapLocationMarker'
import { tryUseMapMode } from '@/composables/mapMode'
import { refreshFicheForMapModeChange } from '@/lib/fiche/ficheInfoService'
import {
  empriseTargetKeyForPoint,
  ensureModeEmpriseForMapPoint,
} from '@/lib/map/searchResultGraphics'

const props = withDefaults(
  defineProps<{
    /** Ne pas rejouer mlon/mlat si une recherche initiale est déjà fournie. */
    skipMarkerRestore?: boolean
  }>(),
  { skipMarkerRestore: false },
)

const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
const permalinkUi = useMapPermalinkUi()
const mapMode = tryUseMapMode()

let moveKey: EventsKey | null = null
let appliedViewFromPermalink = false
let appliedLayersFromPermalink = false
let markerRestored = false

if (locationHashLooksLikeMapPermalink()) {
  bootstrapMapPermalinkFromLocation()
} else {
  initMapPermalinkFromLocation()
}

function applyViewFromPermalink(map: Map): void {
  if (appliedViewFromPermalink) return
  const params = getMapPermalinkParams()
  const center = readMapPermalinkCenter(params)
  const zoom = readMapPermalinkZoom(params)
  if (!center && zoom == null) return
  appliedViewFromPermalink = true
  const view = map.getView()
  if (center) {
    view.setCenter(fromLonLat([center.lon, center.lat], view.getProjection()))
  }
  if (zoom != null) view.setZoom(zoom)
}

function applyTileFromPermalink(): void {
  const ui = permalinkUi
  if (!ui?.presets.length) return
  const tile = readMapPermalinkTileIndex(getMapPermalinkParams())
  if (tile == null) return
  const id = baseIdFromTileIndex(ui.presets, tile)
  if (id) ui.setActiveBaseId(id)
}

function applyLayersFromPermalink(): void {
  if (appliedLayersFromPermalink) return
  const bridge = mapPermalinkLayersBridgeRef.value
  if (!bridge) return
  const hasLayerKeys = layerPermalinkEntriesFromParams(getMapPermalinkParams()).length > 0
  bridge.applyLayerParamsFromPermalink(getMapPermalinkParams())
  if (!hasLayerKeys) appliedLayersFromPermalink = true
}

function restoreMarkerFromPermalink(): void {
  if (markerRestored || props.skipMarkerRestore) return
  const marker = readMapPermalinkMarker(getMapPermalinkParams())
  if (!marker) return
  markerRestored = true
  const mode = mapMode?.mode.value ?? 2
  showMapLocationMarker(marker.lon, marker.lat, { label: '', origin: 'permalink', center: false })
  const key = empriseTargetKeyForPoint(marker.lon, marker.lat)
  ensureModeEmpriseForMapPoint(marker.lon, marker.lat, mode, key)
  /* Fiche : chargée après gpu-client-config via ficheInfoService + cerise permalink. */
}

function syncViewToPermalink(map: Map): void {
  const view = map.getView()
  const center = view.getCenter()
  if (!center) return
  const [lon, lat] = toLonLat(center, view.getProjection())
  updateMapPermalinkParam('lon', lon)
  updateMapPermalinkParam('lat', lat)
  const z = view.getZoom()
  if (z != null) updateMapPermalinkParam('z', z)
}

function onMoveEnd(map: Map): void {
  syncViewToPermalink(map)
  const ui = permalinkUi
  if (ui?.presets.length) {
    updateMapPermalinkParam('tile', tileIndexFromBaseId(ui.presets, ui.getActiveBaseId()))
  }
}

function bindMap(map: Map): void {
  unbindMap()
  applyViewFromPermalink(map)
  applyTileFromPermalink()
  applyLayersFromPermalink()
  restoreMarkerFromPermalink()
  moveKey = map.on('moveend', () => onMoveEnd(map))
  onMoveEnd(map)
}

function unbindMap(): void {
  if (moveKey) {
    unByKey(moveKey)
    moveKey = null
  }
}

watch(
  mapRef,
  (map) => {
    unbindMap()
    if (map) bindMap(map)
  },
  { immediate: true },
)

watch(mapPermalinkLayersBridgeRef, () => {
  applyLayersFromPermalink()
})

watch(
  () => {
    const ui = permalinkUi
    if (!ui?.presets.length) return null
    return ui.activeBaseIdRef?.value ?? ui.getActiveBaseId()
  },
  (baseId) => {
    const ui = permalinkUi
    if (!ui?.presets.length || baseId == null) return
    updateMapPermalinkParam('tile', tileIndexFromBaseId(ui.presets, baseId))
  },
)

watch(
  () => mapMode?.mode.value,
  (mode) => {
    if (mode == null) return
    const marker = readMapPermalinkMarker(getMapPermalinkParams())
    if (!marker) return
    const key = empriseTargetKeyForPoint(marker.lon, marker.lat)
    ensureModeEmpriseForMapPoint(marker.lon, marker.lat, mode, key)
    const map = mapRef.value
    const zoom = map?.getView().getZoom() ?? 6
    refreshFicheForMapModeChange(mode, zoom)
  },
)

onUnmounted(() => {
  unbindMap()
  flushMapPermalinkHashNow()
})
</script>

<template>
  <span class="ec-map-permalink-sync" hidden aria-hidden="true" />
</template>

import { onUnmounted, ref, watch, type Ref, type ShallowRef } from 'vue'
import type Map from 'ol/Map'
import type { EventsKey } from 'ol/events'
import { unByKey } from 'ol/Observable'
import { DEFAULT_PARCEL_FICHE_LEGEND_ZOOM } from '@/lib/fiche/parcelLegendImage'

/** Aligné gpu-client `LegendImages` (LEGEND_ZOOM_DEBOUNCE_MS). */
const LEGEND_ZOOM_DEBOUNCE_MS = 150

/** Zoom entier pour pictos légende scaleDependant (seuil gpu-client, ex. 16). */
export function mapZoomForLegend(map: Map): number {
  const z = map.getView().getZoom()
  if (z == null || Number.isNaN(z)) return DEFAULT_PARCEL_FICHE_LEGEND_ZOOM
  return Math.round(z)
}

/**
 * Suit le zoom carte (moveend + change:resolution) pour basculer lowscale / highscale
 * sur les pictos de fiche parcelle — aligné gpu-client `LegendImages` / `ParcelLegend`.
 */
export function useMapLegendZoom(mapRef: ShallowRef<Map | null> | Ref<Map | null>): {
  legendZoom: Ref<number>
} {
  const legendZoom = ref(DEFAULT_PARCEL_FICHE_LEGEND_ZOOM)
  let keys: EventsKey[] = []
  let debounceId: ReturnType<typeof setTimeout> | null = null

  function unbind(): void {
    for (const key of keys) unByKey(key)
    keys = []
    if (debounceId) {
      clearTimeout(debounceId)
      debounceId = null
    }
  }

  function bindMap(map: Map): void {
    unbind()
    legendZoom.value = mapZoomForLegend(map)
    const applyZoom = () => {
      legendZoom.value = mapZoomForLegend(map)
    }
    const applyZoomDebounced = () => {
      if (debounceId) clearTimeout(debounceId)
      debounceId = setTimeout(applyZoom, LEGEND_ZOOM_DEBOUNCE_MS)
    }
    keys.push(map.on('moveend', applyZoom))
    keys.push(map.getView().on('change:resolution', applyZoomDebounced))
  }

  watch(
    mapRef,
    (map) => {
      unbind()
      if (map) bindMap(map)
    },
    { immediate: true },
  )

  onUnmounted(unbind)

  return { legendZoom }
}

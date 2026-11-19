import { inject, onUnmounted, ref, shallowRef, watch, type ShallowRef } from 'vue'
import type Map from 'ol/Map'

/** Aligné gpu-client `ZOOM_NOTIFY_DELAY_MS` (légendes scale-dépendantes). */
const MAP_ZOOM_DEBOUNCE_MS = 80

/** Zoom courant de la carte (pour plages LAYER_CONFIG, légendes scale-dépendantes, etc.). */
export function useMapZoom() {
  const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
  const mapZoom = ref(6)

  let unbind: (() => void) | undefined
  let debounceId: ReturnType<typeof setTimeout> | null = null

  function bindMap(map: Map | null) {
    unbind?.()
    unbind = undefined
    if (debounceId) {
      clearTimeout(debounceId)
      debounceId = null
    }
    if (!map) return
    const view = map.getView()
    const update = () => {
      const z = view.getZoom()
      if (z != null && Number.isFinite(z)) mapZoom.value = z
    }
    const updateDebounced = () => {
      if (debounceId) clearTimeout(debounceId)
      debounceId = setTimeout(update, MAP_ZOOM_DEBOUNCE_MS)
    }
    update()
    view.on('change:resolution', updateDebounced)
    unbind = () => {
      view.un('change:resolution', updateDebounced)
      if (debounceId) clearTimeout(debounceId)
      debounceId = null
    }
  }

  watch(() => mapRef.value ?? null, bindMap, { immediate: true })
  onUnmounted(() => unbind?.())

  return { mapZoom }
}

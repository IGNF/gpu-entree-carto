import { inject, onUnmounted, ref, shallowRef, watch, type ShallowRef } from 'vue'
import type Map from 'ol/Map'

/** Zoom courant de la carte (pour plages LAYER_CONFIG, légendes scale-dépendantes, etc.). */
export function useMapZoom() {
  const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
  const mapZoom = ref(6)

  let unbind: (() => void) | undefined

  function bindMap(map: Map | null) {
    unbind?.()
    unbind = undefined
    if (!map) return
    const view = map.getView()
    const update = () => {
      mapZoom.value = view.getZoom() ?? mapZoom.value
    }
    update()
    view.on('change:resolution', update)
    unbind = () => view.un('change:resolution', update)
  }

  watch(() => mapRef.value ?? null, bindMap, { immediate: true })
  onUnmounted(() => unbind?.())

  return { mapZoom }
}

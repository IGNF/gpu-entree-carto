import { inject, onUnmounted, shallowRef, watch, type ShallowRef } from 'vue'
import type Map from 'ol/Map'
import type Control from 'ol/control/Control'

/**
 * Attache / détache un contrôle OpenLayers (ou geopf) sur la carte injectée.
 */
export function useOlControl(
  createControl: () => Control,
  options?: {
    /** Hook après création, avant `addControl` (ex. patch DOM). */
    afterCreate?: (control: Control) => void
  },
): void {
  const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
  let control: Control | null = null

  watch(
    mapRef,
    (map, _prev, onCleanup) => {
      if (control && mapRef.value) {
        mapRef.value.removeControl(control)
        control = null
      }
      if (!map) return

      control = createControl()
      options?.afterCreate?.(control)
      map.addControl(control)

      onCleanup(() => {
        if (control && map) {
          map.removeControl(control)
          control = null
        }
      })
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (control && mapRef.value) {
      mapRef.value.removeControl(control)
    }
    control = null
  })
}

import { inject, onUnmounted, shallowRef, watch, type ShallowRef } from 'vue'
import type Map from 'ol/Map'
import type Control from 'ol/control/Control'

/**
 * Attache / détache un contrôle OpenLayers (ou geopf) sur la carte injectée.
 * @returns réf. du contrôle courant (null si pas de carte)
 */
export function useOlControl(
  createControl: () => Control,
  options?: {
    /** Hook après création, avant `addControl` (ex. patch DOM). */
    afterCreate?: (control: Control) => void
  },
): ShallowRef<Control | null> {
  const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
  const controlRef = shallowRef<Control | null>(null)

  watch(
    mapRef,
    (map, _prev, onCleanup) => {
      if (controlRef.value && mapRef.value) {
        mapRef.value.removeControl(controlRef.value)
        controlRef.value = null
      }
      if (!map) return

      const control = createControl()
      options?.afterCreate?.(control)
      map.addControl(control)
      controlRef.value = control

      onCleanup(() => {
        if (controlRef.value && map) {
          map.removeControl(controlRef.value)
          controlRef.value = null
        }
      })
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (controlRef.value && mapRef.value) {
      mapRef.value.removeControl(controlRef.value)
    }
    controlRef.value = null
  })

  return controlRef
}

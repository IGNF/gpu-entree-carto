import { computed, ref, watch, type Ref } from 'vue'
import type Map from 'ol/Map'
import type { EventsKey } from 'ol/events'
import { unByKey } from 'ol/Observable'

/** Durée de la remise au nord (comme le bouton boussole de gpu-client / OpenLayers). */
const RESET_NORTH_DURATION_MS = 250

/**
 * Orientation de la carte (radians) et bascule nord / orientation précédente, pour la boussole
 * (ordinateur et mobile).
 * La carte tourne avec Alt+Maj+glisser ou la rotation à deux doigts (interactions OpenLayers par défaut).
 */
export function useMapRotation(mapRef: Ref<Map | null>) {
  const rotation = ref(0)
  /** Orientation quittée au dernier retour au nord (valable tant que la carte reste au nord). */
  const previousRotation = ref<number | null>(null)
  const isNorth = computed(() => Math.abs(rotation.value) < 1e-6)
  const canRestore = computed(() => isNorth.value && previousRotation.value != null)
  let key: EventsKey | null = null

  watch(
    mapRef,
    (map, _old, onCleanup) => {
      if (key) unByKey(key)
      key = null
      if (!map) return
      const view = map.getView()
      rotation.value = view.getRotation()
      key = view.on('change:rotation', () => {
        rotation.value = view.getRotation()
      })
      onCleanup(() => {
        if (key) unByKey(key)
        key = null
      })
    },
    { immediate: true },
  )

  /** Carte tournée : retour au nord. Carte au nord : retour à l’orientation quittée, s’il y en a une. */
  function toggleNorth(): void {
    const view = mapRef.value?.getView()
    if (!view) return
    if (!isNorth.value) {
      previousRotation.value = view.getRotation()
      view.animate({ rotation: 0, duration: RESET_NORTH_DURATION_MS })
    } else if (previousRotation.value != null) {
      const target = previousRotation.value
      previousRotation.value = null
      view.animate({ rotation: target, duration: RESET_NORTH_DURATION_MS })
    }
  }

  return { rotation, canRestore, toggleNorth }
}

import { onUnmounted, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import type Map from 'ol/Map'
import type Feature from 'ol/Feature'
import type { EventsKey } from 'ol/events'
import { createEmpty, extend, isEmpty } from 'ol/extent'
import { unByKey } from 'ol/Observable'
import type VectorSource from 'ol/source/Vector'
import type { VectorSourceEvent } from 'ol/source/Vector'
import { animateViewFit } from '@/lib/map/animateViewFit'
import { maxZoomForModeEmpriseFit } from '@/lib/map/focusModeEmprise'
import { defaultMapViewFitPadding } from '@/lib/map/mapViewFitPadding'
import type { MapModeId } from '@/lib/map/mapMode'
import { MODE_EMPRISE_PROP, searchEngineLayerHostRef } from '@/lib/map/searchResultGraphics'

/** Laisse arriver toutes les parties d’une emprise (commune + arrondissement) avant de recentrer. */
const FIT_DELAY_MS = 50

/**
 * Recentre la carte sur l’emprise rouge (parcelle / commune) dès qu’elle est dessinée sur la couche
 * recherche — clic, recherche de lieu ou identifiant de parcelle.
 */
export function useFitOnModeEmprise(
  mapRef: Ref<Map | null>,
  mode: MaybeRefOrGetter<MapModeId>,
): void {
  let key: EventsKey | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  function fitToEmprise(source: VectorSource): void {
    const map = mapRef.value
    if (!map) return
    const extent = createEmpty()
    for (const feature of source.getFeatures()) {
      const geometry = feature.getGeometry()
      if (feature.get(MODE_EMPRISE_PROP) && geometry) extend(extent, geometry.getExtent())
    }
    if (isEmpty(extent)) return
    animateViewFit(map, extent, {
      padding: defaultMapViewFitPadding(),
      maxZoom: maxZoomForModeEmpriseFit(map, toValue(mode)),
    })
  }

  watch(
    () => searchEngineLayerHostRef.value?.layer?.getSource() ?? null,
    (sourceLike) => {
      if (key) unByKey(key)
      key = null
      const source = sourceLike as VectorSource | null
      if (!source || typeof source.on !== 'function') return
      key = source.on('addfeature', (event: VectorSourceEvent<Feature>) => {
        if (!event.feature?.get(MODE_EMPRISE_PROP)) return
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          timer = null
          fitToEmprise(source)
        }, FIT_DELAY_MS)
      })
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (key) unByKey(key)
    if (timer) clearTimeout(timer)
  })
}

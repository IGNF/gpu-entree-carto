import { easeOut } from 'ol/easing'
import type { Extent } from 'ol/extent'
import type Map from 'ol/Map'
import type { FitOptions } from 'ol/View'

/** Durée du vol de carte après une recherche de localisation. */
export const LOCATION_SEARCH_ANIMATION_MS = 650

export type AnimateViewFitOptions = Omit<FitOptions, 'duration' | 'easing'> & {
  duration?: number
}

export function animateViewFit(
  map: Map,
  extent: Extent,
  options: AnimateViewFitOptions = {},
): void {
  const { duration, ...fitOptions } = options
  map.getView().fit(extent, {
    ...fitOptions,
    duration: duration ?? LOCATION_SEARCH_ANIMATION_MS,
    easing: easeOut,
  })
}

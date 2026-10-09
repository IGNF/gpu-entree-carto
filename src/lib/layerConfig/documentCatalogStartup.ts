import {
  getMapPermalinkParams,
  initMapPermalinkFromLocation,
  layerPermalinkEntriesFromParams,
} from '@/lib/map/mapPermalink'

/** Capturé une fois au boot SPA (avant sync carte → hash). */
let layerPermalinkInInitialHash: boolean | undefined

/**
 * À appeler au chargement de `/map` avant montage carte / TabPanels.
 * Distingue un hash « utilisateur » (couches déjà présentes) des clés `dev-*`
 * ajoutées ensuite par MapPermalinkSync.
 */
export function captureInitialLayerPermalinkFromLocation(): void {
  if (layerPermalinkInInitialHash !== undefined) return
  if (typeof window === 'undefined') {
    layerPermalinkInInitialHash = false
    return
  }
  initMapPermalinkFromLocation()
  layerPermalinkInInitialHash = layerPermalinkEntriesFromParams(getMapPermalinkParams()).length > 0
}

export function initialHashHadLayerPermalinkParams(): boolean {
  if (layerPermalinkInInitialHash === undefined) {
    captureInitialLayerPermalinkFromLocation()
  }
  return layerPermalinkInInitialHash === true
}

/** Vitest uniquement — réinitialise la capture « boot ». */
export function resetLayerPermalinkBootCaptureForTests(): void {
  layerPermalinkInInitialHash = undefined
}

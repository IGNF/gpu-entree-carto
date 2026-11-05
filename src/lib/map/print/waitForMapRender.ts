import type Map from 'ol/Map'

/** Attend au moins un cycle rendercomplete (tuiles WMS/WMTS en cours). */
export function waitForMapRender(map: Map, passes = 2, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve) => {
    let done = 0
    const finish = () => {
      map.un('rendercomplete', onComplete)
      resolve()
    }
    const timer = typeof window !== 'undefined' ? window.setTimeout(finish, timeoutMs) : undefined
    const onComplete = () => {
      done += 1
      if (done >= passes) {
        if (timer !== undefined) window.clearTimeout(timer)
        finish()
      }
    }
    map.on('rendercomplete', onComplete)
    map.renderSync()
  })
}

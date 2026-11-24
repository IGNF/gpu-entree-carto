import type Map from 'ol/Map'

/**
 * `renderSync()` seulement si la carte a une cible : OL 10 plante (`renderer_` null) sur une
 * carte détachée — cas de l’aperçu d’impression après fermeture de la modale.
 */
export function renderSyncIfAttached(map: Map | null | undefined): void {
  if (map?.getTargetElement()) map.renderSync()
}

/** Attend `passes` cycles rendercomplete consécutifs (tuiles WMS/WMTS en cours), au plus `timeoutMs`. */
export function waitForMapRender(map: Map, passes = 2, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve) => {
    if (!map.getTargetElement()) {
      resolve()
      return
    }
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
        return
      }
      // Carte au repos : OL n’émet plus rien sans nouvelle demande de rendu.
      map.render()
    }
    map.on('rendercomplete', onComplete)
    map.renderSync()
  })
}

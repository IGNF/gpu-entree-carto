/**
 * DSFR en mode Vue : pas d’auto-start — à appeler après le montage de l’app (voir index.html `window.dsfr`).
 */
declare global {
  interface Window {
    dsfr?: {
      start: () => void
      stop: () => void
    }
  }
}

export function startDsfrForVueApp(): void {
  window.dsfr?.start()
}

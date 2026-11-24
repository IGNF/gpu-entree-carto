/**
 * OL 10 instancie `ResizeObserver` dans le constructeur de `Map` ; jsdom ne le fournit pas.
 * À appeler en tête des specs qui créent une vraie carte OpenLayers.
 */
export function stubResizeObserver(): void {
  if (typeof globalThis.ResizeObserver !== 'undefined') return
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

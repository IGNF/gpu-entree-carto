import { inject, onMounted, onUnmounted, ref, shallowRef, type ShallowRef } from 'vue'
import type Map from 'ol/Map'

/** Élément passé à l’API Fullscreen (carte + panneau latéral / overlays du shell). */
export function getMapShellFullscreenElement(map: Map | null): HTMLElement | null {
  const target = map?.getTargetElement()
  if (!(target instanceof HTMLElement)) return null
  const shell = target.closest('.ec-map-shell')
  return shell instanceof HTMLElement ? shell : target
}

const PSEUDO_FULLSCREEN_CLASS = 'ec-map-shell--viewport-maximized'
const PSEUDO_FULLSCREEN_HTML_CLASS = 'ec-html--map-viewport-maximized'

function clearPseudoFullscreen(root: HTMLElement | null) {
  root?.classList.remove(PSEUDO_FULLSCREEN_CLASS)
  document.documentElement.classList.remove(PSEUDO_FULLSCREEN_HTML_CLASS)
}

function enablePseudoFullscreen(root: HTMLElement) {
  root.classList.add(PSEUDO_FULLSCREEN_CLASS)
  document.documentElement.classList.add(PSEUDO_FULLSCREEN_HTML_CLASS)
}

/** Zoom avant/arrière et plein écran (barre mobile TabPanels). */
export function useMapViewportControls() {
  const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
  const isFullscreen = ref(false)

  function syncFullscreenState() {
    const root = getMapShellFullscreenElement(mapRef.value)
    isFullscreen.value =
      Boolean(document.fullscreenElement) ||
      Boolean(root?.classList.contains(PSEUDO_FULLSCREEN_CLASS))
  }

  function onFullscreenChange() {
    if (!document.fullscreenElement) {
      clearPseudoFullscreen(getMapShellFullscreenElement(mapRef.value))
    }
    syncFullscreenState()
    window.dispatchEvent(new Event('ec-map-viewport-chrome-remount'))
  }

  onMounted(() => {
    syncFullscreenState()
    document.addEventListener('fullscreenchange', onFullscreenChange)
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    clearPseudoFullscreen(getMapShellFullscreenElement(mapRef.value))
  })

  function zoomBy(delta: number) {
    const map = mapRef.value
    if (!map) return
    const view = map.getView()
    const current = view.getZoom()
    if (current == null) return
    view.animate({ zoom: current + delta, duration: 200 })
  }

  async function toggleFullscreen() {
    const root = getMapShellFullscreenElement(mapRef.value)
    if (!root) return
    const pseudoActive = root.classList.contains(PSEUDO_FULLSCREEN_CLASS)
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (pseudoActive) {
        clearPseudoFullscreen(root)
      } else if (typeof root.requestFullscreen === 'function') {
        try {
          await root.requestFullscreen()
        } catch {
          enablePseudoFullscreen(root)
        }
      } else {
        enablePseudoFullscreen(root)
      }
    } catch {
      if (!document.fullscreenElement && !pseudoActive) {
        enablePseudoFullscreen(root)
      }
    } finally {
      syncFullscreenState()
      window.dispatchEvent(new Event('ec-map-viewport-chrome-remount'))
    }
  }

  return {
    zoomIn: () => zoomBy(1),
    zoomOut: () => zoomBy(-1),
    toggleFullscreen,
    isFullscreen,
  }
}

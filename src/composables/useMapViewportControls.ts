import { inject, onMounted, onUnmounted, ref, shallowRef, type ShallowRef } from 'vue'
import type Map from 'ol/Map'

/** Élément passé à l’API Fullscreen (carte + panneau latéral / overlays du shell). */
export function getMapShellFullscreenElement(map: Map | null): HTMLElement | null {
  const target = map?.getTargetElement()
  if (!(target instanceof HTMLElement)) return null
  const shell = target.closest('.ec-map-shell')
  return shell instanceof HTMLElement ? shell : target
}

/** Zoom avant/arrière et plein écran (barre mobile TabPanels). */
export function useMapViewportControls() {
  const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
  const isFullscreen = ref(false)

  function syncFullscreenState() {
    isFullscreen.value = Boolean(document.fullscreenElement)
  }

  onMounted(() => {
    syncFullscreenState()
    document.addEventListener('fullscreenchange', syncFullscreenState)
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', syncFullscreenState)
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
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await root.requestFullscreen()
    } catch {
      /* plein écran refusé ou indisponible */
    } finally {
      syncFullscreenState()
    }
  }

  return {
    zoomIn: () => zoomBy(1),
    zoomOut: () => zoomBy(-1),
    toggleFullscreen,
    isFullscreen,
  }
}

import { onUnmounted, watch, type ShallowRef } from 'vue'
import type Map from 'ol/Map'
import { attachStandalonePopoverSync } from '@/lib/search/attachStandalonePopoverSync'

/**
 * Mobile (barre basse) : ancre autocomplete / Avancée comme sur le SearchEngine autonome.
 */
export function useMobileSearchPopoverSync(mapRef: ShallowRef<Map | null>) {
  let detachPopovers: (() => void) | null = null
  let shellObserver: MutationObserver | null = null

  function isMobileSearchLayout(): boolean {
    return Boolean(
      document
        .querySelector('.ec-map-shell')
        ?.classList.contains('ec-map-shell--tab-panels-layout-bottom'),
    )
  }

  function sync() {
    if (!mapRef.value || !isMobileSearchLayout()) {
      detachPopovers?.()
      detachPopovers = null
      return
    }
    const root = document.getElementById('gpu-map')
    if (!root) return
    if (!detachPopovers) {
      detachPopovers = attachStandalonePopoverSync(root)
    }
  }

  watch(mapRef, () => sync(), { immediate: true })

  onUnmounted(() => {
    shellObserver?.disconnect()
    shellObserver = null
    detachPopovers?.()
    detachPopovers = null
  })

  function startShellClassObserver() {
    const shell = document.querySelector('.ec-map-shell')
    if (!shell) return
    shellObserver?.disconnect()
    shellObserver = new MutationObserver(() => sync())
    shellObserver.observe(shell, { attributes: true, attributeFilter: ['class'] })
    sync()
  }

  return { startMobileSearchPopoverSync: startShellClassObserver }
}

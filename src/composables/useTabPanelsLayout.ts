import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import {
  measureMobileFixedChromeTops,
  measureSiteHeaderOffsetForMapShell,
  mobileMapFixedOriginTopPx,
  TAB_PANELS_MOBILE_MEDIA,
  type TabPanelsLayoutMode,
} from '@/lib/map/tabPanelsLayout'

export function useTabPanelsLayout(mapShellRef: Ref<HTMLElement | null>) {
  const layoutMode = ref<TabPanelsLayoutMode>('side')
  const siteHeaderOffsetPx = ref(0)

  let media: MediaQueryList | null = null
  let shellClassObserver: MutationObserver | null = null
  let remeasureTimer: ReturnType<typeof setTimeout> | null = null

  function applyLayout() {
    layoutMode.value = media?.matches ? 'bottom' : 'side'
    const shell = mapShellRef.value?.closest('.ec-map-shell')
    if (shell instanceof HTMLElement) {
      siteHeaderOffsetPx.value = measureSiteHeaderOffsetForMapShell(shell)
      shell.classList.toggle(
        'ec-map-shell--tab-panels-layout-bottom',
        layoutMode.value === 'bottom',
      )
      shell.style.setProperty('--ec-tab-panels-site-header-offset', `${siteHeaderOffsetPx.value}px`)
      const mapViewportTop = Math.max(0, Math.round(shell.getBoundingClientRect().top))
      shell.style.setProperty('--ec-mobile-map-viewport-top', `${mapViewportTop}px`)
      const fixedOriginTop = mobileMapFixedOriginTopPx(shell)
      shell.style.setProperty('--ec-mobile-map-fixed-origin-top', `${fixedOriginTop}px`)
      measureMobileFixedChromeTops(shell, fixedOriginTop)
    }
  }

  /** Plein écran → sortie : le shell se déplace, remesure après paint. */
  function remeasureAfterViewportChange() {
    applyLayout()
    requestAnimationFrame(() => applyLayout())
    if (remeasureTimer) clearTimeout(remeasureTimer)
    remeasureTimer = setTimeout(() => {
      remeasureTimer = null
      applyLayout()
    }, 150)
  }

  function attachShellClassObserver(shell: HTMLElement) {
    shellClassObserver?.disconnect()
    shellClassObserver = new MutationObserver((records) => {
      if (records.some((r) => r.type === 'attributes' && r.attributeName === 'class')) {
        remeasureAfterViewportChange()
      }
    })
    shellClassObserver.observe(shell, { attributes: true, attributeFilter: ['class'] })
  }

  function bindShellObservers() {
    const shell = mapShellRef.value?.closest('.ec-map-shell')
    if (shell instanceof HTMLElement) attachShellClassObserver(shell)
  }

  onMounted(() => {
    media = window.matchMedia(TAB_PANELS_MOBILE_MEDIA)
    applyLayout()
    bindShellObservers()
    media.addEventListener('change', applyLayout)
    window.addEventListener('resize', applyLayout)
    document.addEventListener('fullscreenchange', remeasureAfterViewportChange)
    window.addEventListener('ec-map-viewport-chrome-remount', remeasureAfterViewportChange)
    window.visualViewport?.addEventListener('resize', remeasureAfterViewportChange)
    window.visualViewport?.addEventListener('scroll', remeasureAfterViewportChange)
  })

  onUnmounted(() => {
    media?.removeEventListener('change', applyLayout)
    window.removeEventListener('resize', applyLayout)
    document.removeEventListener('fullscreenchange', remeasureAfterViewportChange)
    window.removeEventListener('ec-map-viewport-chrome-remount', remeasureAfterViewportChange)
    window.visualViewport?.removeEventListener('resize', remeasureAfterViewportChange)
    window.visualViewport?.removeEventListener('scroll', remeasureAfterViewportChange)
    shellClassObserver?.disconnect()
    shellClassObserver = null
    if (remeasureTimer) clearTimeout(remeasureTimer)
    mapShellRef.value
      ?.closest('.ec-map-shell')
      ?.classList.remove('ec-map-shell--tab-panels-layout-bottom')
  })

  watch(mapShellRef, () => bindShellObservers())

  return { layoutMode, siteHeaderOffsetPx, refreshLayoutMetrics: remeasureAfterViewportChange }
}

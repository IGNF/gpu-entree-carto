import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import {
  measureSiteHeaderOffsetForMapShell,
  TAB_PANELS_MOBILE_MEDIA,
  type TabPanelsLayoutMode,
} from '@/lib/map/tabPanelsLayout'

export function useTabPanelsLayout(mapShellRef: Ref<HTMLElement | null>) {
  const layoutMode = ref<TabPanelsLayoutMode>('side')
  const siteHeaderOffsetPx = ref(0)

  let media: MediaQueryList | null = null

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
      /* fixed = viewport : empiler recherche + mode depuis le haut réel de la carte (sous l’en-tête site). */
      const mapViewportTop = Math.max(0, Math.round(shell.getBoundingClientRect().top))
      shell.style.setProperty('--ec-mobile-map-viewport-top', `${mapViewportTop}px`)
    }
  }

  onMounted(() => {
    media = window.matchMedia(TAB_PANELS_MOBILE_MEDIA)
    applyLayout()
    media.addEventListener('change', applyLayout)
    window.addEventListener('resize', applyLayout)
  })

  onUnmounted(() => {
    media?.removeEventListener('change', applyLayout)
    window.removeEventListener('resize', applyLayout)
    mapShellRef.value
      ?.closest('.ec-map-shell')
      ?.classList.remove('ec-map-shell--tab-panels-layout-bottom')
  })

  return { layoutMode, siteHeaderOffsetPx, refreshLayoutMetrics: applyLayout }
}

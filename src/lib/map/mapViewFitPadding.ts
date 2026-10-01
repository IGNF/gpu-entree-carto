import { tabPanelsApiRef } from '@/composables/tabPanels'

/** Largeur du bandeau TabPanels ouvert (onglets + panneau). */
export function tabPanelsRightInset(): number {
  const el = document.querySelector('.ec-tab-panels.is-open')
  if (!(el instanceof HTMLElement)) return 40
  return Math.ceil(el.getBoundingClientRect().width) + 24
}

/** Padding [top, right, bottom, left] pour un `view.fit` avec panneau latéral. */
export function defaultMapViewFitPadding(): [number, number, number, number] {
  const rightPad = tabPanelsApiRef.value?.isOpen.value ? tabPanelsRightInset() : 72
  return [72, rightPad, 72, 72]
}

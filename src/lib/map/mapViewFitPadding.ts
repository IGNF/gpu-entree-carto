import { tabPanelsApiRef } from '@/composables/tabPanels'

function mapShellEl(): HTMLElement | null {
  const shell = document.querySelector('.ec-map-shell')
  return shell instanceof HTMLElement ? shell : null
}

/** Largeur du bandeau TabPanels ouvert (onglets + panneau), bureau latéral. */
export function tabPanelsRightInset(): number {
  const mapShell = mapShellEl()
  if (mapShell?.classList.contains('ec-map-shell--tab-panels-layout-bottom')) return 40

  /*
   * Mesurer la surface panneau, pas `.ec-tab-panels-shell` (inset:0 = toute la carte).
   * Sinon le padding droit du `view.fit` ≈ largeur carte → cerise collée à gauche.
   */
  const surface = document.querySelector('.ec-tab-panels-shell.is-open .ec-tab-panels__surface')
  if (surface instanceof HTMLElement) {
    const panelW = surface.getBoundingClientRect().width
    if (panelW > 64) {
      const tabs = document.querySelector('#gpu-map .ec-tab-panels__tabs-control')
      const tabsW = tabs instanceof HTMLElement ? tabs.getBoundingClientRect().width : 48
      return Math.ceil(panelW + tabsW) + 24
    }
  }

  if (mapShell instanceof HTMLElement) {
    const inset =
      parseFloat(getComputedStyle(mapShell).getPropertyValue('--ec-tab-panels-inset')) || 0
    if (inset > 64) {
      return Math.ceil(inset) + 72
    }
  }

  return 40
}

/** Hauteur occupée en bas (feuille + barre d’onglets), mobile. */
export function tabPanelsBottomInset(): number {
  const mapShell = mapShellEl()
  if (!mapShell?.classList.contains('ec-map-shell--tab-panels-layout-bottom')) return 72
  if (!mapShell.classList.contains('ec-map-shell--tab-panels-open')) return 72
  const styles = getComputedStyle(mapShell)
  const sheet = parseFloat(styles.getPropertyValue('--ec-tab-panels-sheet-occupied-height')) || 0
  const chrome = parseFloat(styles.getPropertyValue('--ec-tab-panels-bottom-chrome')) || 56
  return Math.ceil(sheet + chrome) + 24
}

/** Padding [top, right, bottom, left] pour un `view.fit` avec panneau latéral. */
export function defaultMapViewFitPadding(): [number, number, number, number] {
  const open = tabPanelsApiRef.value?.isOpen.value
  if (!open) return [72, 72, 72, 72]
  const mapShell = mapShellEl()
  if (mapShell?.classList.contains('ec-map-shell--tab-panels-layout-bottom')) {
    return [72, 72, tabPanelsBottomInset(), 72]
  }
  return [72, tabPanelsRightInset(), 72, 72]
}

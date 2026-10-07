/**
 * Gabarit panneau à onglets — bureau (latéral) et mobile (bottom sheet).
 */

/** Disposition : colonne à droite (bureau) ou feuille basse (mobile). */
export type TabPanelsLayoutMode = 'side' | 'bottom'

/** Aligné sur `main.css` (grille responsive). */
export const TAB_PANELS_MOBILE_MEDIA = '(max-width: 48rem)'

/**
 * Snap points hauteur feuille mobile (% de la zone carte utilisable, hors barre d’onglets).
 * 0 = fermé ; 98 % = développé (sous plafond safe areas + en-tête si chevauchement).
 */
export const TAB_PANELS_SHEET_SNAP_PERCENT = [0, 35, 70, 98] as const

export type TabPanelsSheetSnapIndex = 0 | 1 | 2 | 3

/** Ouverture manuelle d’un onglet (tap barre basse). */
export const TAB_PANELS_DEFAULT_OPEN_SNAP: TabPanelsSheetSnapIndex = 2

/** Ouverture automatique (click info, recherche lieu, fiche). */
export const TAB_PANELS_AUTO_OPEN_SNAP: TabPanelsSheetSnapIndex = 1

export function snapPercentForIndex(index: TabPanelsSheetSnapIndex): number {
  return TAB_PANELS_SHEET_SNAP_PERCENT[index] ?? 0
}

/** Index du snap le plus proche (fraction 0–100). */
export function nearestSheetSnapIndex(fractionPercent: number): TabPanelsSheetSnapIndex {
  let best: TabPanelsSheetSnapIndex = 0
  let bestDist = Infinity
  for (let i = 0; i < TAB_PANELS_SHEET_SNAP_PERCENT.length; i++) {
    const idx = i as TabPanelsSheetSnapIndex
    const dist = Math.abs(TAB_PANELS_SHEET_SNAP_PERCENT[idx] - fractionPercent)
    if (dist < bestDist) {
      bestDist = dist
      best = idx
    }
  }
  return best
}

/** En-tête site chevauchant le haut de la carte (px) — 0 si la carte est déjà sous le bandeau. */
export function measureSiteHeaderOffsetForMapShell(mapShell: HTMLElement): number {
  const header = document.querySelector('.ec-demo-header, header[role="banner"]')
  if (!(header instanceof HTMLElement)) return 0
  const headerBottom = header.getBoundingClientRect().bottom
  const mapTop = mapShell.getBoundingClientRect().top
  if (headerBottom <= mapTop + 1) return 0
  return Math.max(0, Math.ceil(headerBottom - mapTop))
}

export function isIosTouchWebKit(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function isMapViewportMaximized(mapShell: HTMLElement): boolean {
  if (mapShell.classList.contains('ec-map-shell--viewport-maximized')) return true
  return document.fullscreenElement === mapShell
}

const MOBILE_FIXED_PROBE_TOP_PX = 10
const MOBILE_FIXED_PROBE_TOLERANCE_PX = 3

/**
 * Safari iOS hors plein écran : le containing block de `position: fixed` est `.ec-map-shell`.
 * Fenêtre étroite bureau, Firefox vue adaptative, Chrome DevTools : repère viewport.
 */
export function detectMobileFixedUsesShellContainingBlock(mapShell: HTMLElement): boolean {
  const shellTop = mapShell.getBoundingClientRect().top
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText =
    'position:fixed;top:10px;left:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;z-index:-1'
  mapShell.appendChild(probe)
  const probeTop = probe.getBoundingClientRect().top
  mapShell.removeChild(probe)

  const viewportDelta = Math.abs(probeTop - MOBILE_FIXED_PROBE_TOP_PX)
  const shellDelta = Math.abs(probeTop - (shellTop + MOBILE_FIXED_PROBE_TOP_PX))
  if (shellDelta + MOBILE_FIXED_PROBE_TOLERANCE_PX < viewportDelta) return true
  return false
}

/**
 * @deprecated Préférer {@link detectMobileFixedUsesShellContainingBlock} / {@link mobileMapFixedOriginTopPx}.
 */
export function usesShellRelativeMobileFixedTop(): boolean {
  const shell = document.querySelector('.ec-map-shell.ec-map-shell--tab-panels-layout-bottom')
  if (shell instanceof HTMLElement) return detectMobileFixedUsesShellContainingBlock(shell)
  return false
}

function readShellCssPx(mapShell: HTMLElement, name: string, fallback: number): number {
  const raw = getComputedStyle(mapShell).getPropertyValue(name).trim()
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

/** Barre recherche geopf dans le shell carte. */
export function queryMobileSearchBarElement(mapShell: HTMLElement): HTMLElement | null {
  const widget = mapShell.querySelector('.gpf-widget[id^="GPsearchEngine-"]')
  return widget instanceof HTMLElement ? widget : null
}

/**
 * Valeur CSS `top` pour un ancrage viewport Y connu (selon origine fixed calibrée).
 */
export function mobileFixedTopCSSValue(
  viewportY: number,
  shellTop: number,
  originPx: number,
): number {
  if (originPx === 0) return Math.round(viewportY - shellTop)
  return Math.round(viewportY)
}

/**
 * Origine Y pour `position: fixed` (mobile feuille basse).
 * Repère shell (Safari iOS) → `0` ; repère viewport (bureau, vue adaptative) → `shellTop`.
 */
export function mobileMapFixedOriginTopPx(mapShell: HTMLElement): number {
  const shellTop = Math.max(0, Math.round(mapShell.getBoundingClientRect().top))
  if (isMapViewportMaximized(mapShell)) return shellTop
  if (!mapShell.classList.contains('ec-map-shell--tab-panels-layout-bottom')) return shellTop
  if (detectMobileFixedUsesShellContainingBlock(mapShell)) return 0
  return shellTop
}

/**
 * Positions `top` mesurées pour croquis / minimap / territoires (fallback CSS si absent).
 */
export function measureMobileFixedChromeTops(mapShell: HTMLElement, originPx: number): void {
  const clear = () => {
    mapShell.style.removeProperty('--ec-mobile-sketch-toolbar-top-measured')
    mapShell.style.removeProperty('--ec-mobile-minimap-top-measured')
    mapShell.style.removeProperty('--ec-mobile-territories-panel-top-measured')
  }

  if (!mapShell.classList.contains('ec-map-shell--tab-panels-layout-bottom')) {
    clear()
    return
  }

  const shellTop = mapShell.getBoundingClientRect().top
  const gap = readShellCssPx(mapShell, '--ec-widget-gap', 8)
  const toTop = (viewportY: number) => `${mobileFixedTopCSSValue(viewportY, shellTop, originPx)}px`

  const modeEl = mapShell.querySelector('.ec-map-mode-selector')
  if (!(modeEl instanceof HTMLElement)) {
    clear()
    return
  }

  const modeRect = modeEl.getBoundingClientRect()
  mapShell.style.setProperty(
    '--ec-mobile-sketch-toolbar-top-measured',
    toTop(modeRect.bottom + gap),
  )
  mapShell.style.setProperty('--ec-mobile-minimap-top-measured', toTop(modeRect.top))

  const searchBar = queryMobileSearchBarElement(mapShell)
  const territoriesViewportTop = searchBar
    ? searchBar.getBoundingClientRect().bottom + gap
    : modeRect.top
  mapShell.style.setProperty(
    '--ec-mobile-territories-panel-top-measured',
    toTop(territoriesViewportTop),
  )
}

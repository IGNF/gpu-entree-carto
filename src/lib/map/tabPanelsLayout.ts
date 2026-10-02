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

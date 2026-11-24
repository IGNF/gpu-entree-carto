import { computeScaleCoeff } from '@/lib/map/print/printScale'

/** Marges autour de la feuille d’aperçu dans sa colonne (ombre portée du cadre). */
export const PREVIEW_FRAME_MARGIN_PX = { top: 6, bottom: 12, horizontal: 10 } as const

/**
 * Échelle feuille → aperçu pour que la feuille (portrait ou paysage) tienne entière dans la
 * colonne d’aperçu mesurée (hors barre de pagination). 0 tant que la colonne n’est pas mesurée.
 */
export function printPreviewPaperScale(
  column: { width: number; height: number },
  paperPx: { width: number; height: number },
): number {
  const m = PREVIEW_FRAME_MARGIN_PX
  const width = column.width - 2 * m.horizontal
  const height = column.height - m.top - m.bottom
  if (width < 16 || height < 16 || paperPx.width <= 0 || paperPx.height <= 0) return 0
  return computeScaleCoeff(width, height, paperPx.width, paperPx.height)
}

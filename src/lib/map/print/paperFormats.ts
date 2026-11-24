export type PaperFormatId = 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'B4' | 'B5'

export const COEFF_PX2MM = 0.264583333
export const MM_PER_INCH = 25.4
export const BASE_DPI = 96
export const HIGH_DPI_VALUE = 300
export const MAX_HIGH_DPI_PAPER_AREA = 250 * 353

export const PAPER_FORMATS_MM: Record<PaperFormatId, { width: number; height: number }> = {
  A0: { width: 841, height: 1189 },
  A1: { width: 594, height: 841 },
  A2: { width: 420, height: 594 },
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  B4: { width: 250, height: 353 },
  B5: { width: 176, height: 250 },
}

export function isPaperFormatAllowedAtHighDpi(paperFormat: PaperFormatId): boolean {
  const selected = PAPER_FORMATS_MM[paperFormat]
  return selected.width * selected.height <= MAX_HIGH_DPI_PAPER_AREA
}

export function convertMmToPx(valueMm: number, dpiValue: number): number {
  return Math.round((valueMm / MM_PER_INCH) * dpiValue)
}

/** Options du sélecteur « Dimensions » : toujours toutes sélectionnables. */
export function paperFormatSelectOptions(): { value: PaperFormatId; text: string }[] {
  return Object.entries(PAPER_FORMATS_MM).map(([format, dimension]) => ({
    value: format as PaperFormatId,
    text: `${format} (${dimension.width} x ${dimension.height} mm)`,
  }))
}

/**
 * Options du sélecteur « Résolution » : 300 DPI limité aux formats ≤ B4
 * (au-delà, taille de canvas hors limites de certains navigateurs).
 */
export function dpiSelectOptions(
  paperFormat: PaperFormatId,
): { value: number; text: string; disabled?: boolean }[] {
  const highAllowed = isPaperFormatAllowedAtHighDpi(paperFormat)
  return [
    { value: BASE_DPI, text: '96 DPI (écran)' },
    {
      value: HIGH_DPI_VALUE,
      text: highAllowed ? '300 DPI (impression)' : '300 DPI (impression) — formats ≤ B4',
      disabled: !highAllowed,
    },
  ]
}

/** DPI effectif pour un format : un grand format choisi à 300 DPI repasse en 96 DPI. */
export function resolveDpiForPaperFormat(dpi: number, paperFormat: PaperFormatId): number {
  if (dpi === HIGH_DPI_VALUE && !isPaperFormatAllowedAtHighDpi(paperFormat)) return BASE_DPI
  return dpi
}

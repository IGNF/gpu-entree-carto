/**
 * Taille physique des attributions (logos, texte) et de la barre d’échelle de la carte imprimée.
 * Référence : logo mesuré à ≈ 19,3 mm de haut sur un export A4 (aperçu à taille écran fixe),
 * divisé par 2, puis proportionnel au plus petit côté du papier.
 */
export const PRINT_ATTRIBUTION_LOGO_HEIGHT_MM_A4 = 19.3 / 2

/** Hauteur CSS de référence du logo dans l’aperçu (`--ec-attribution-logo-height` à l’échelle 1). */
export const PRINT_ATTRIBUTION_LOGO_HEIGHT_PX = 34

const A4_SHORT_SIDE_MM = 210

export function printAttributionLogoHeightMm(paper: { widthMm: number; heightMm: number }): number {
  return (
    (PRINT_ATTRIBUTION_LOGO_HEIGHT_MM_A4 * Math.min(paper.widthMm, paper.heightMm)) /
    A4_SHORT_SIDE_MM
  )
}

/**
 * Facteur appliqué aux tailles CSS des attributions et de l’échelle de l’aperçu
 * (`--ec-print-ui-scale`) ; l’export reproduisant l’aperçu, la taille papier suit.
 * @param previewPxPerMm px CSS d’aperçu par mm de papier
 */
export function printMapUiScale(
  paper: { widthMm: number; heightMm: number },
  previewPxPerMm: number,
): number {
  return (printAttributionLogoHeightMm(paper) * previewPxPerMm) / PRINT_ATTRIBUTION_LOGO_HEIGHT_PX
}

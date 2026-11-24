/**
 * `pixelRatio` OpenLayers de la carte d’export.
 *
 * L’export a `r` fois plus de pixels que l’aperçu (r ≈ 1,2 à 96 DPI, ≈ 4 à 300 DPI en A4).
 * - pixelRatio = r : mêmes tuiles que l’aperçu, mais tuiles raster agrandies r× (flou à 300 DPI) ;
 * - pixelRatio = 1 : tuiles log2(r) niveaux plus détaillées, libellés r× trop petits (illisibles).
 * Compromis : un niveau de tuiles de moins que log2(r) (jamais moins que l’aperçu), le reste
 * en pixelRatio (≈ 1,4 à 2,8). Vecteurs et WMS `hidpi` sont redessinés nets à ce pixelRatio.
 */
export function printExportPixelRatio(exportWidthPx: number, previewWidthPx: number): number {
  const ratio = exportWidthPx / previewWidthPx
  if (!Number.isFinite(ratio) || ratio <= 0) return 1
  const extraZoomLevels = Math.max(0, Math.round(Math.log2(ratio)) - 1)
  return ratio / 2 ** extraZoomLevels
}

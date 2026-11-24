import { describe, expect, it } from 'vitest'
import { printExportPixelRatio } from '@/lib/map/print/printExportPixelRatio'

/** Niveaux de tuiles en plus que l’aperçu = log2(rapport export / aperçu ÷ pixelRatio). */
const extraZoom = (exportW: number, previewW: number) =>
  Math.log2(exportW / previewW / printExportPixelRatio(exportW, previewW))

describe('printExportPixelRatio', () => {
  it('96 DPI (export ≈ aperçu) : mêmes tuiles que l’aperçu, simple rééchantillonnage', () => {
    expect(printExportPixelRatio(718, 619)).toBeCloseTo(718 / 619, 5)
    expect(extraZoom(718, 619)).toBeCloseTo(0, 5)
  })

  it('A4 300 DPI (×4) : un niveau de tuiles en plus, pixelRatio 2', () => {
    expect(printExportPixelRatio(2244, 561)).toBeCloseTo(2, 5)
    expect(extraZoom(2244, 561)).toBeCloseTo(1, 5)
  })

  it('le pixelRatio reste entre ~1,4 et ~2,8 : les tuiles raster ne sont jamais agrandies plus de ~3×', () => {
    for (let ratio = 1.5; ratio <= 16; ratio += 0.1) {
      const k = printExportPixelRatio(1000 * ratio, 1000)
      expect(k).toBeGreaterThan(1.4)
      expect(k).toBeLessThan(2.9)
      expect(Number.isInteger(Math.round(extraZoom(1000 * ratio, 1000) * 1e6) / 1e6)).toBe(true)
    }
  })

  it('entrées invalides : 1 (rendu actuel)', () => {
    expect(printExportPixelRatio(1000, 0)).toBe(1)
    expect(printExportPixelRatio(0, 600)).toBe(1)
    expect(printExportPixelRatio(Number.NaN, 600)).toBe(1)
  })
})

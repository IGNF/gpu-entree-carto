import { describe, expect, it } from 'vitest'
import { convertMmToPx } from '@/lib/map/print/paperFormats'
import {
  MIN_READABLE_BODY_FONT_MM,
  printSupplementCssVars,
  printSupplementScale,
} from '@/lib/map/print/printSupplementLayout'

const A4 = { widthMm: 210, heightMm: 297 }
const A5 = { widthMm: 148, heightMm: 210 }
const A3 = { widthMm: 297, heightMm: 420 }
const B4 = { widthMm: 250, heightMm: 353 }

describe('printSupplementScale (textes et images hors carte)', () => {
  it('A4 : ×1,5 à 300 DPI, ×1 à 96 DPI', () => {
    expect(printSupplementScale(A4, 300)).toBeCloseTo(1.5, 5)
    expect(printSupplementScale(A4, 96)).toBeCloseTo(1, 5)
  })

  it('proportionnel au format (petit côté), portrait ou paysage', () => {
    expect(printSupplementScale(B4, 300)).toBeCloseTo((1.5 * 250) / 210, 5)
    expect(printSupplementScale(A3, 96)).toBeCloseTo(297 / 210, 5)
    expect(printSupplementScale({ widthMm: 297, heightMm: 210 }, 300)).toBeCloseTo(1.5, 5)
  })

  it('plus petit sur un petit format, sans passer sous le seuil de lisibilité', () => {
    const a5 = printSupplementScale(A5, 300)
    expect(a5).toBeLessThan(printSupplementScale(A4, 300))
    expect(a5).toBeCloseTo((1.5 * 148) / 210, 5)
    // A5 96 DPI : 0,705 × 2,8 mm = 2 mm < 2,5 mm → plancher
    expect(2.8 * printSupplementScale(A5, 96)).toBeCloseTo(MIN_READABLE_BODY_FONT_MM, 5)
  })
})

describe('printSupplementCssVars', () => {
  const px = (v: string) => Number.parseInt(v, 10)

  it('A4 300 DPI : corps de texte 2,8 mm × 1,5', () => {
    const vars = printSupplementCssVars(2244, 300, A4)
    expect(px(vars['--print-body-font'])).toBe(convertMmToPx(2.8 * 1.5, 300))
    expect(px(vars['--print-title-font'])).toBe(convertMmToPx(4.5 * 1.5, 300))
  })

  it('300 DPI : pictos de légende et icônes de règles à 5 mm × coef. (deux fois l’ancienne taille)', () => {
    const vars = printSupplementCssVars(2244, 300, A4)
    expect(px(vars['--print-legend-img-size'])).toBe(convertMmToPx(5 * 1.5, 300))
  })

  it('96 DPI : pictos à leur taille naturelle (pas de taille imposée)', () => {
    expect(printSupplementCssVars(718, 96, A4)['--print-legend-img-size']).toBeUndefined()
  })

  it('la marge intérieure des pages n’est pas agrandie', () => {
    const a = printSupplementCssVars(2244, 300, A4)['--print-supplement-slice-inset']
    expect(px(a)).toBe(convertMmToPx(1.6, 300))
  })
})

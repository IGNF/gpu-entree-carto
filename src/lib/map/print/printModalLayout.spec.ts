import { describe, expect, it } from 'vitest'
import { PREVIEW_FRAME_MARGIN_PX, printPreviewPaperScale } from '@/lib/map/print/printModalLayout'

const A4 = { width: 794, height: 1123 } // px CSS à 96 DPI
const A4_LANDSCAPE = { width: 1123, height: 794 }

function fitsInColumn(scale: number, paper: typeof A4, column: { width: number; height: number }) {
  const m = PREVIEW_FRAME_MARGIN_PX
  return (
    paper.width * scale + 2 * m.horizontal <= column.width + 0.5 &&
    paper.height * scale + m.top + m.bottom <= column.height + 0.5
  )
}

describe('printPreviewPaperScale', () => {
  const column = { width: 1290, height: 760 }

  it('portrait : la feuille tient entièrement dans la colonne d’aperçu', () => {
    const k = printPreviewPaperScale(column, A4)
    expect(fitsInColumn(k, A4, column)).toBe(true)
  })

  it('paysage : la feuille tient aussi (plus de débordement à droite)', () => {
    const k = printPreviewPaperScale(column, A4_LANDSCAPE)
    expect(fitsInColumn(k, A4_LANDSCAPE, column)).toBe(true)
  })

  it('remplit la colonne sur la dimension limitante', () => {
    const k = printPreviewPaperScale(column, A4)
    const m = PREVIEW_FRAME_MARGIN_PX
    expect(A4.height * k).toBeCloseTo(column.height - m.top - m.bottom, 0)
  })

  it('colonne pas encore mesurée : 0 (aucune taille NaN / négative)', () => {
    expect(printPreviewPaperScale({ width: 0, height: 0 }, A4)).toBe(0)
    expect(printPreviewPaperScale({ width: 10, height: 10 }, A4)).toBe(0)
  })
})

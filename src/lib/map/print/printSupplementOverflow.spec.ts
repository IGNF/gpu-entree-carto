/**
 * Régression PDF 300 DPI (page 4 des légendes) : une ligne qui dépasse le bas de feuille de
 * moins que la tolérance (≈ 0,8 % de la hauteur, 26 px à 300 DPI) n’était ni reportée ni masquée
 * → tronquée par le cadre, et sa fin perdue à la page suivante.
 */
import { describe, expect, it } from 'vitest'
import {
  computeSupplementSlicePlan,
  measureSupplementSlicePlanFromPage,
  hideSupplementElementsForSlice,
  resolveSupplementSliceEndPx,
} from '@/lib/map/print/printSupplementLayout'

function rect(top: number, bottom: number, width = 400): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: width,
    width,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }
}

/** Page légendes : une ligne de 2 items (deux colonnes) à [rowTop, rowBottom]. */
function legendPage(pageHeight: number, rowTop: number, rowBottom: number) {
  const page = document.createElement('article')
  page.className = 'ec-print-supplement-page ec-print-legends'
  const items = [0, 1].map(() => {
    const li = document.createElement('li')
    li.className = 'ec-layer-legends__item'
    li.getBoundingClientRect = () => rect(rowTop, rowBottom, 200)
    Object.defineProperty(li, 'offsetHeight', { configurable: true, value: rowBottom - rowTop })
    page.appendChild(li)
    return li
  })
  page.getBoundingClientRect = () => rect(0, Math.max(pageHeight, rowBottom))
  Object.defineProperty(page, 'scrollHeight', { configurable: true, value: rowBottom })
  return { page, items }
}

const cases = [
  { dpi: 300, pageHeight: 3300, rowTop: 3240, rowBottom: 3315 }, // dépasse de 15 px (< 26)
  { dpi: 96, pageHeight: 1050, rowTop: 1020, rowBottom: 1055 }, // dépasse de 5 px (< 8,4)
]

describe.each(cases)('ligne qui déborde à peine du bas de feuille ($dpi DPI)', (c) => {
  it('la coupure remonte au-dessus de la ligne (reportée à la page suivante)', () => {
    const { page } = legendPage(c.pageHeight, c.rowTop, c.rowBottom)
    expect(resolveSupplementSliceEndPx(page, 0, c.pageHeight)).toBe(c.rowTop)
  })

  it('elle est masquée sur la page courante au lieu d’être tronquée', () => {
    const { page, items } = legendPage(c.pageHeight, c.rowTop, c.rowBottom)
    hideSupplementElementsForSlice(page, 0, c.pageHeight)
    for (const li of items) expect(li.style.visibility).toBe('hidden')
  })

  it('le plan compte une page de plus', () => {
    const { page } = legendPage(c.pageHeight, c.rowTop, c.rowBottom)
    const plan = computeSupplementSlicePlan(page, c.pageHeight)
    expect(plan.sliceStarts).toEqual([0, c.rowTop])
  })
})

describe('tolérance d’arrondi conservée', () => {
  it('une ligne qui dépasse d’un sous-pixel reste sur la page', () => {
    const { page, items } = legendPage(1050, 1020, 1050.6)
    expect(resolveSupplementSliceEndPx(page, 0, 1050)).toBe(1050)
    hideSupplementElementsForSlice(page, 0, 1050)
    for (const li of items) expect(li.style.visibility).toBe('')
  })
})

describe('dernière ligne juste sous le bas de feuille (< 4 % de la hauteur)', () => {
  it('300 DPI : une ligne entière sous la page donne bien une 2e page', () => {
    // première ligne en haut, dernière ligne à 3310–3370 : 70 px sous une page de 3300 px
    const { page, items } = legendPage(3300, 3310, 3370)
    const first = document.createElement('li')
    first.className = 'ec-layer-legends__item'
    first.getBoundingClientRect = () => rect(0, 40, 200)
    Object.defineProperty(first, 'offsetHeight', { configurable: true, value: 40 })
    page.prepend(first)
    void items
    const plan = measureSupplementSlicePlanFromPage(page, 3300)
    expect(plan.sliceCount).toBe(2)
    expect(plan.sliceStarts[1]).toBeGreaterThan(40)
    expect(plan.sliceStarts[1]).toBeLessThanOrEqual(3310)
  })
})

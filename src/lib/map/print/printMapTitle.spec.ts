import { describe, expect, it } from 'vitest'
import {
  computePrintMapTitleLayout,
  normalizePrintMapTitle,
  wrapPrintMapTitleLines,
} from '@/lib/map/print/printMapTitle'

describe('printMapTitle', () => {
  it('tronque les titres trop longs', () => {
    const long = 'a'.repeat(120)
    expect(normalizePrintMapTitle(long).length).toBeLessThanOrEqual(100)
    expect(normalizePrintMapTitle(long).endsWith('…')).toBe(true)
  })

  it('limite la hauteur du titre pour préserver la carte', () => {
    const layout = computePrintMapTitleLayout('Un titre très long '.repeat(8), 180, 250, true)
    expect(layout.titleHeightMm).toBeLessThanOrEqual(250 * 0.12 + 0.01)
    expect(250 - layout.titleHeightMm).toBeGreaterThanOrEqual(250 * 0.38 - 0.01)
  })

  it('découpe le titre sur plusieurs lignes', () => {
    const lines = wrapPrintMapTitleLines('Mot '.repeat(30), 180, 3.2)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.length).toBeLessThanOrEqual(3)
  })
})

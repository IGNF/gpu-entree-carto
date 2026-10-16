import { describe, expect, it } from 'vitest'
import { buildPrintPreviewPages, countSupplementSlices } from '@/lib/map/print/printPageTypes'

describe('printPageTypes', () => {
  it('countSupplementSlices rounds up content height', () => {
    expect(countSupplementSlices(100, 400)).toBe(1)
    expect(countSupplementSlices(420, 400)).toBe(2)
    expect(countSupplementSlices(1200, 400)).toBe(3)
  })

  it('countSupplementSlices drops a nearly empty last page', () => {
    expect(countSupplementSlices(810, 400)).toBe(2)
    expect(countSupplementSlices(850, 400)).toBe(3)
  })

  it('buildPrintPreviewPages expands annex sections into multiple slices', () => {
    const pages = buildPrintPreviewPages({
      includeTerritoryFiche: true,
      includeParcelFiche: false,
      includeLegends: true,
      canTerritory: true,
      canParcel: false,
      canLegends: true,
      sliceCounts: { ficheTerritory: 2, legends: 3 },
    })
    expect(pages).toHaveLength(1 + 2 + 3)
    expect(pages[1]).toMatchObject({ kind: 'ficheTerritory', sliceIndex: 0, sliceCount: 2 })
    expect(pages[2]).toMatchObject({ kind: 'ficheTerritory', sliceIndex: 1, sliceCount: 2 })
    expect(pages[3]).toMatchObject({ kind: 'legends', sliceIndex: 0, sliceCount: 3 })
  })
})

import { describe, expect, it } from 'vitest'
import { nearestSheetSnapIndex, snapPercentForIndex } from '@/lib/map/tabPanelsLayout'

describe('tabPanelsLayout', () => {
  it('snapPercentForIndex', () => {
    expect(snapPercentForIndex(0)).toBe(0)
    expect(snapPercentForIndex(3)).toBe(98)
  })

  it('nearestSheetSnapIndex', () => {
    expect(nearestSheetSnapIndex(0)).toBe(0)
    expect(nearestSheetSnapIndex(34)).toBe(1)
    expect(nearestSheetSnapIndex(55)).toBe(2)
    expect(nearestSheetSnapIndex(97)).toBe(3)
  })
})

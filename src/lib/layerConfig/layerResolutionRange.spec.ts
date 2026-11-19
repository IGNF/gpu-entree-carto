import { describe, expect, it } from 'vitest'
import { getLayerResolutionRange } from '@/lib/layerConfig/layerResolutionRange'

function createViewLike({ minZoom = 5, maxZoom = 22 } = {}) {
  const baseResolution = 156543.03392804097
  return {
    minZoom,
    maxZoom,
    getMinZoom() {
      return this.minZoom
    },
    getResolutionForZoom(zoom: number) {
      const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom))
      return baseResolution / Math.pow(2, clampedZoom)
    },
  }
}

describe('getLayerResolutionRange', () => {
  it('borne haute exclusive au zoom minZoom−1 (gpu-client)', () => {
    const view = createViewLike()
    const range = getLayerResolutionRange(view as never, 16, 21)
    expect(range.maxResolution).toBe(view.getResolutionForZoom(15))
    expect(range.minResolution).toBe(view.getResolutionForZoom(21))
  })
})

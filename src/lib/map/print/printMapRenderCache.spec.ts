import { describe, expect, it } from 'vitest'
import { buildPrintMapRenderCacheKey } from '@/lib/map/print/printMapRenderCache'

const base = {
  dpi: 300,
  mapWidthPx: 2244,
  mapHeightPx: 3200,
  extent: [0, 0, 1000, 1500],
  layerFingerprint: 'plan:1:0',
  rotation: 0,
  previewWidthPx: 561,
}

describe('buildPrintMapRenderCacheKey', () => {
  it('dépend de la largeur de l’aperçu (elle fixe le pixelRatio et le niveau de tuiles)', () => {
    expect(buildPrintMapRenderCacheKey(base)).not.toBe(
      buildPrintMapRenderCacheKey({ ...base, previewWidthPx: 700 }),
    )
  })

  it('stable pour des entrées identiques', () => {
    expect(buildPrintMapRenderCacheKey({ ...base })).toBe(buildPrintMapRenderCacheKey(base))
  })
})

import { describe, expect, it } from 'vitest'
import { resolveStandardViewerStartupBbox } from '@/lib/map/viewerStartupBbox'

describe('resolveStandardViewerStartupBbox', () => {
  it('utilise params.bbox', () => {
    const bbox = [1, 2, 3, 4] as [number, number, number, number]
    expect(resolveStandardViewerStartupBbox({ bbox })).toEqual(bbox)
  })

  it('parse la bbox sur le document si params.bbox absent', () => {
    expect(
      resolveStandardViewerStartupBbox({
        document: { id: 'x', bbox: '2.1,48.9,2.5,49.1' },
      }),
    ).toEqual([2.1, 48.9, 2.5, 49.1])
  })

  it('ignore la bbox si recherche initiale (POST gpu-site)', () => {
    expect(
      resolveStandardViewerStartupBbox({
        bbox: [1, 2, 3, 4],
        search: { fullText: 'Paris' },
      }),
    ).toBeNull()
  })
})

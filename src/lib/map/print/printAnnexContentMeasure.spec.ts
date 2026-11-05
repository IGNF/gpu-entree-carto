import { describe, expect, it } from 'vitest'
import {
  annexKindsToInvalidateForContentChange,
  buildAnnexContentMeasureSnapshot,
  type BuildAnnexContentMeasureSnapshotInput,
} from '@/lib/map/print/printAnnexContentMeasure'

const snap = (overrides: Partial<BuildAnnexContentMeasureSnapshotInput> = {}) =>
  buildAnnexContentMeasureSnapshot({
    territoryTabCount: 2,
    parcelInfosLength: 100,
    parcelDocumentsLength: 50,
    parcelLegendScale: 'highscale',
    legendsIncludeAll: false,
    legendPreviewZoom: 16,
    legendLayerIds: 'x',
    legendItemCount: 3,
    ...overrides,
  })

describe('annexKindsToInvalidateForContentChange', () => {
  it('ne fait rien au premier passage', () => {
    const next = snap()
    expect(annexKindsToInvalidateForContentChange(null, next)).toEqual([])
  })

  it('parcelle : bande lowscale/highscale uniquement', () => {
    const prev = snap({ parcelLegendScale: 'highscale' })
    const next = snap({ parcelLegendScale: 'lowscale' })
    expect(annexKindsToInvalidateForContentChange(prev, next)).toEqual(['ficheParcel'])
  })

  it('légendes : zoom seulement si filtrées', () => {
    const prev = snap({ legendPreviewZoom: 14 })
    const next = snap({ legendPreviewZoom: 18 })
    expect(annexKindsToInvalidateForContentChange(prev, next)).toEqual(['legends'])
  })

  it('toutes les légendes : pas de remesure au zoom', () => {
    const prev = snap({ legendsIncludeAll: true, legendPreviewZoom: 10 })
    const next = snap({ legendsIncludeAll: true, legendPreviewZoom: 18 })
    expect(annexKindsToInvalidateForContentChange(prev, next)).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import {
  supplementContentSuffixForKind,
  type SupplementContentFingerprints,
} from '@/lib/map/print/printSlicePlanCache'

const base: SupplementContentFingerprints = {
  territoryTabCount: 3,
  parcelInfosLength: 1000,
  parcelDocumentsLength: 500,
  parcelLegendScale: 'highscale',
  legendsIncludeAll: false,
  legendPreviewZoom: 14,
  legendLayerIds: 'a,b',
  legendItemCount: 12,
}

describe('supplementContentSuffixForKind', () => {
  it('fiche territoire : pas de zoom carte', () => {
    expect(supplementContentSuffixForKind('ficheTerritory', base)).toBe('t:3')
  })

  it('fiche parcelle : bande lowscale/highscale, pas le zoom entier', () => {
    expect(supplementContentSuffixForKind('ficheParcel', base)).toBe('p:1000:500|highscale')
    expect(
      supplementContentSuffixForKind('ficheParcel', { ...base, parcelLegendScale: 'lowscale' }),
    ).toBe('p:1000:500|lowscale')
  })

  it('légendes filtrées : zoom aperçu', () => {
    expect(supplementContentSuffixForKind('legends', base)).toBe('l:a,b|n:12|z:14')
  })

  it('toutes les légendes : pas de zoom dans l’empreinte', () => {
    expect(
      supplementContentSuffixForKind('legends', {
        ...base,
        legendsIncludeAll: true,
        legendPreviewZoom: 99,
      }),
    ).toBe('l:all:a,b|n:12')
  })
})

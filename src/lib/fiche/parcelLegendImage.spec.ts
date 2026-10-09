import { describe, expect, it } from 'vitest'
import {
  getParcelLegendImageRelativePath,
  getLegendConfigFromFeature,
  type ParcelLegendConfigEntry,
} from '@/lib/fiche/parcelLegendImage'

const zoneConfig: ParcelLegendConfigEntry = {
  name: 'zone_urba',
  type: 'du',
  filter: 'typezone',
  allowedValues: ['U', 'AU'],
  visibility: { highscale: [16], lowscale: [0, 15] },
}

describe('parcelLegendImage', () => {
  it('construit le chemin zone_urba comme ParcelLegend', () => {
    const feature = {
      id: 'zone_urba.1',
      properties: { typezone: 'U', libelle: 'UM' },
    }
    expect(getLegendConfigFromFeature(feature, [zoneConfig])?.name).toBe('zone_urba')
    expect(getParcelLegendImageRelativePath(zoneConfig, feature, 17)).toBe(
      'zone_urba/U-highscale.png',
    )
    expect(getParcelLegendImageRelativePath(zoneConfig, feature, 10)).toBe(
      'zone_urba/U-lowscale.png',
    )
  })

  it('refuse une valeur hors allowedValues', () => {
    const feature = { id: 'zone_urba.2', properties: { typezone: 'N' } }
    expect(getParcelLegendImageRelativePath(zoneConfig, feature, 17)).toBeNull()
  })
})

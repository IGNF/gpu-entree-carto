import { describe, expect, it } from 'vitest'
import LocateControl from '@/lib/control/LocateControl'
import Geocode from '@/lib/services/Geocode'
import {
  toLocationRedirectParams,
  zoomForLocationSearch,
} from '@/lib/search/locationSearch'
import config from '@/lib/config'
import packageJson from '../../package.json'

describe('lib exports unitaires', () => {
  it('expose config et version package', () => {
    expect(config).toBeTruthy()
    expect(packageJson.version).toBeTruthy()
  })

  it('filtre les résultats autocomplétion comme LocateControl', () => {
    const locate = new LocateControl()
    expect(
      locate.isAllowedResult({
        fullText: 'Paris',
        type: 'StreetAddress',
        kind: 'municipality',
        position: { x: 0, y: 0 },
      }),
    ).toBe(false)
  })

  it('instancie Geocode', () => {
    expect(typeof new Geocode().autoComplete).toBe('function')
  })

  it('calcule le zoom selon le type de lieu', () => {
    expect(zoomForLocationSearch({ type: 'StreetAddress' })).toBe(18)
    expect(zoomForLocationSearch({ type: 'PositionOfInterest' })).toBe(13)
    expect(
      zoomForLocationSearch({ type: 'PositionOfInterest', poiType: ['département'] }),
    ).toBe(9)
  })

  it('sérialise les params formulaire gpu-site', () => {
    expect(
      toLocationRedirectParams({
        fullText: 'Paris',
        type: 'PositionOfInterest',
        position: { x: 2.3, y: 48.8 },
      }),
    ).toEqual({
      municipality: 'Paris',
      position_x: '2.3',
      position_y: '48.8',
      type: 'PositionOfInterest',
    })
  })
})

import { describe, expect, it } from 'vitest'
import LocateControl from '@/lib/control/LocateControl'
import Geocode from '@/lib/services/Geocode'
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
})

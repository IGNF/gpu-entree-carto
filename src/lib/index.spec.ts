import { describe, expect, it } from 'vitest'
import gpu from '@/lib/index'

describe('lib gpu export', () => {
  it('expose createStandardViewer, ParcelViewer et Geocode', () => {
    expect(typeof gpu.createStandardViewer).toBe('function')
    expect(typeof gpu.ParcelViewer).toBe('function')
    expect(typeof gpu.services.Geocode).toBe('function')
    expect(typeof gpu.control.LocateControl).toBe('function')
    expect(gpu.config).toBeTruthy()
    expect(gpu.informations.version).toBeTruthy()
  })

  it('filtre les résultats autocomplétion comme LocateControl', () => {
    const locate = new gpu.control.LocateControl()
    expect(
      locate.isAllowedResult({
        fullText: 'Paris',
        type: 'StreetAddress',
        kind: 'municipality',
        position: { x: 0, y: 0 },
      }),
    ).toBe(false)
  })
})

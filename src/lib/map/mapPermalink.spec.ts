import { describe, expect, it } from 'vitest'
import { isSafeMapPermalinkKey, parseMapPermalinkHash } from '@/lib/map/mapPermalink'

describe('mapPermalink security', () => {
  it('rejects prototype-pollution key names from the hash', () => {
    const parsed = parseMapPermalinkHash('#__proto__=evil&lon=2.3&lat=48.8')
    expect(parsed).toEqual({ lon: '2.3', lat: '48.8' })
    expect(Object.prototype.hasOwnProperty.call(parsed, '__proto__')).toBe(false)
  })

  it('allows gpu-client layer id characters', () => {
    expect(isSafeMapPermalinkKey('mec_mec_%_du_%')).toBe(true)
    expect(isSafeMapPermalinkKey('zone,scot')).toBe(true)
  })
})

import { describe, expect, it, vi } from 'vitest'
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

describe('resetMapPermalinkState (démos sans permalien)', () => {
  it('oublie cerise et couches mémorisées et retire le fragment de l’adresse', async () => {
    const {
      resetMapPermalinkState,
      setMapPermalinkMarker,
      getMapPermalinkParams,
      readMapPermalinkMarker,
    } = await import('@/lib/map/mapPermalink')
    window.history.replaceState(null, '', '/fiche-info#lon=2.35&lat=48.85&mlon=2.35&mlat=48.85')
    setMapPermalinkMarker(2.35, 48.85)
    expect(readMapPermalinkMarker(getMapPermalinkParams())).not.toBeNull()

    resetMapPermalinkState()

    expect(readMapPermalinkMarker(getMapPermalinkParams())).toBeNull()
    expect(getMapPermalinkParams()).toEqual({})
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/fiche-info')
  })
})

describe('écriture de l’adresse suspendue sur les démos sans permalien', () => {
  it('après remise à zéro : rien n’est écrit ; à la reprise, l’état courant est réécrit', async () => {
    vi.useFakeTimers()
    try {
      const { resetMapPermalinkState, resumeMapPermalinkHashWrites, setMapPermalinkMarker } =
        await import('@/lib/map/mapPermalink')
      window.history.replaceState(null, '', '/fiche-info')
      resetMapPermalinkState()
      setMapPermalinkMarker(1.27, 43.57)
      vi.runAllTimers()
      expect(window.location.hash).toBe('')

      window.history.replaceState(null, '', '/map')
      resumeMapPermalinkHashWrites()
      vi.runAllTimers()
      expect(window.location.hash).toContain('mlon=')
    } finally {
      vi.useRealTimers()
    }
  })
})

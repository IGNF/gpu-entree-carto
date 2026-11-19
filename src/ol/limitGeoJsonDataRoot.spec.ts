import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import config from '@/lib/config'
import { limitGeoJsonAssetUrl, resolveLimitGeoJsonDataRoot } from '@/ol/limitGeoJsonDataRoot'

const DEMO_BASE = '/gpu-entree-carto/'

describe('resolveLimitGeoJsonDataRoot', () => {
  const previousBaseUrl = config.baseUrl

  beforeEach(() => {
    delete config.baseUrl
  })

  afterEach(() => {
    if (previousBaseUrl === undefined) {
      delete config.baseUrl
    } else {
      config.baseUrl = previousBaseUrl
    }
  })

  it('sans baseUrl → fallback Vite BASE_URL', () => {
    expect(resolveLimitGeoJsonDataRoot(DEMO_BASE)).toBe(DEMO_BASE)
  })

  it('baseUrl "/" → racine du site (pas le préfixe /map/)', () => {
    config.baseUrl = '/'
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://example.com'
    expect(resolveLimitGeoJsonDataRoot('/map/')).toBe(`${origin}/`)
  })

  it('baseUrl absolue même origine → racine config', () => {
    if (typeof window === 'undefined') return
    config.baseUrl = `${window.location.origin}/`
    expect(resolveLimitGeoJsonDataRoot('/map/')).toBe(`${window.location.origin}/`)
  })

  it('baseUrl absolue autre origine (démo GH) → fallback bundle', () => {
    config.baseUrl = 'https://www.geoportail-urbanisme.gouv.fr/'
    expect(resolveLimitGeoJsonDataRoot(DEMO_BASE)).toBe(DEMO_BASE)
  })

  it('construit l’URL json-data', () => {
    config.baseUrl = '/'
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://example.com'
    expect(limitGeoJsonAssetUrl('region-fr-geojson.json', '/map/')).toBe(
      `${origin}/json-data/region-fr-geojson.json`,
    )
  })
})

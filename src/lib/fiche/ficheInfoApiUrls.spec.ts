import { describe, expect, it, vi, afterEach } from 'vitest'
import config from '@/lib/config'
import {
  ficheInfoUsesV2SplitEndpoints,
  resolveFicheInfoEndpointUrl,
  shouldAppendLegacyFicheModeParam,
} from '@/lib/fiche/ficheInfoApiUrls'

describe('ficheInfoApiUrls', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('dérive territoire/parcelle depuis une base v2', () => {
    config.apiFicheInfoUrl = '/api/fiche-info-v2'
    expect(ficheInfoUsesV2SplitEndpoints('/api/fiche-info-v2')).toBe(true)
    expect(resolveFicheInfoEndpointUrl('territoire')).toBe('/api/fiche-info-v2/territoire')
    expect(resolveFicheInfoEndpointUrl('parcelle')).toBe('/api/fiche-info-v2/parcelle')
    expect(resolveFicheInfoEndpointUrl('combined')).toBe('/api/fiche-info-v2')
  })

  it('legacy : une seule URL sans suffixe', () => {
    config.apiFicheInfoUrl = '/api/fiche-info'
    expect(shouldAppendLegacyFicheModeParam('/api/fiche-info')).toBe(true)
    expect(resolveFicheInfoEndpointUrl('territoire')).toBe('/api/fiche-info')
  })
})

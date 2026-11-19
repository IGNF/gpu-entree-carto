import { afterEach, describe, expect, it } from 'vitest'
import config from '@/lib/config'
import {
  preferFicheInfoV2CombinedFetch,
  resolveFicheInfoCombinedFetchUrl,
} from '@/lib/fiche/ficheInfoApiUrls'

describe('ficheInfoApiUrls — fetch combiné v2', () => {
  afterEach(() => {
    delete (config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl
    delete (config as { apiFicheInfoTerritoireUrl?: string }).apiFicheInfoTerritoireUrl
    delete (config as { apiFicheInfoParcelleUrl?: string }).apiFicheInfoParcelleUrl
    delete (config as { apiFicheInfoCombinedUrl?: string }).apiFicheInfoCombinedUrl
    delete (config as { apiFicheInfoPreferCombined?: boolean }).apiFicheInfoPreferCombined
  })

  it('active le combiné quand les endpoints v2 split sont configurés', () => {
    ;(config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl = '/api/fiche-info-v2/territoire'
    ;(config as { apiFicheInfoCombinedUrl?: string }).apiFicheInfoCombinedUrl = '/api/fiche-info-v2'
    expect(preferFicheInfoV2CombinedFetch()).toBe(true)
    expect(resolveFicheInfoCombinedFetchUrl()).toBe('/api/fiche-info-v2')
  })

  it('désactive si apiFicheInfoPreferCombined vaut false', () => {
    ;(config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl = '/api/fiche-info-v2/territoire'
    ;(config as { apiFicheInfoCombinedUrl?: string }).apiFicheInfoCombinedUrl = '/api/fiche-info-v2'
    ;(config as { apiFicheInfoPreferCombined?: boolean }).apiFicheInfoPreferCombined = false
    expect(preferFicheInfoV2CombinedFetch()).toBe(false)
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import config from '@/lib/config'
import {
  preferFicheInfoV2CombinedFetch,
  resolveFicheInfoCombinedFetchUrl,
  resolveFicheInfoFetchUrl,
} from '@/lib/fiche/ficheInfoApiUrls'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY } from '@/lib/map/mapMode'

describe('ficheInfoApiUrls — fetch combiné', () => {
  afterEach(() => {
    delete (config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl
    delete (config as { apiFicheInfoTerritoireUrl?: string }).apiFicheInfoTerritoireUrl
    delete (config as { apiFicheInfoParcelleUrl?: string }).apiFicheInfoParcelleUrl
    delete (config as { apiFicheInfoCombinedUrl?: string }).apiFicheInfoCombinedUrl
    delete (config as { apiFicheInfoPreferCombined?: boolean }).apiFicheInfoPreferCombined
  })

  it('active le combiné quand les endpoints v2 split sont configurés', () => {
    ;(config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl = '/api/fiche-info/territoire'
    ;(config as { apiFicheInfoCombinedUrl?: string }).apiFicheInfoCombinedUrl = '/api/fiche-info'
    expect(preferFicheInfoV2CombinedFetch()).toBe(true)
    expect(resolveFicheInfoCombinedFetchUrl()).toBe('/api/fiche-info')
  })

  it('désactive si apiFicheInfoPreferCombined vaut false', () => {
    ;(config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl = '/api/fiche-info/territoire'
    ;(config as { apiFicheInfoCombinedUrl?: string }).apiFicheInfoCombinedUrl = '/api/fiche-info'
    ;(config as { apiFicheInfoPreferCombined?: boolean }).apiFicheInfoPreferCombined = false
    expect(preferFicheInfoV2CombinedFetch()).toBe(false)
  })

  it('dérive combiné, territoire et parcelle de apiFicheInfoUrl seule', () => {
    ;(config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl = '/api/fiche-info/'
    expect(preferFicheInfoV2CombinedFetch()).toBe(true)
    expect(resolveFicheInfoCombinedFetchUrl()).toBe('/api/fiche-info')
    expect(resolveFicheInfoFetchUrl(MAP_MODE_TERRITORY)).toBe('/api/fiche-info/territoire')
    expect(resolveFicheInfoFetchUrl(MAP_MODE_PARCEL)).toBe('/api/fiche-info/parcelle')
  })

  it('privilégie les URLs territoire/parcelle explicites', () => {
    ;(config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl = '/api/fiche-info'
    ;(config as { apiFicheInfoParcelleUrl?: string }).apiFicheInfoParcelleUrl = '/autre/parcelle'
    expect(resolveFicheInfoFetchUrl(MAP_MODE_PARCEL)).toBe('/autre/parcelle')
  })
})

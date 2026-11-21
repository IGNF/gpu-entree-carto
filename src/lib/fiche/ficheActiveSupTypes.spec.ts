import { afterEach, describe, expect, it } from 'vitest'
import {
  activeSupTypesForFetch,
  missingFicheInfoSupTypes,
  unionAcquiredSupTypes,
} from '@/lib/fiche/ficheActiveSupTypes'
import config from '@/lib/config'
import { setFicheCatalogFamilyVisibility } from '@/lib/fiche/ficheCatalogVisibilityFilter'
import { setFicheCatalogSupTypes } from '@/lib/fiche/ficheCatalogLayerScope'

describe('ficheActiveSupTypes', () => {
  it('calcule les types SUP manquants', () => {
    expect(missingFicheInfoSupTypes(['AC1', 'AC4'], new Set(['AC1']))).toEqual(['AC4'])
    expect(missingFicheInfoSupTypes(null, new Set(['AC1']))).toEqual([])
    expect(missingFicheInfoSupTypes(['AC1'], null)).toEqual([])
  })

  it('fusionne les types acquis', () => {
    expect(unionAcquiredSupTypes(new Set(['AC1']), ['AC4'])).toEqual(new Set(['AC1', 'AC4']))
    expect(unionAcquiredSupTypes(new Set(['AC1']), null)).toBe(null)
    expect(unionAcquiredSupTypes(new Set(['AC1']), undefined)).toEqual(new Set(['AC1']))
  })

  it('dérive activeSupTypesForFetch pour un complément catalogue', () => {
    ;(config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl = '/api/fiche-info-v2'
    setFicheCatalogFamilyVisibility({
      du: false,
      psmv: false,
      sup: true,
      scot: false,
      mec: false,
    })
    setFicheCatalogSupTypes(new Set(['AC1', 'AC4']))
    expect(activeSupTypesForFetch(['sup'], ['du', 'sup'], new Set(['AC1']))).toEqual(['AC4'])
  })

  afterEach(() => {
    delete (config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl
    setFicheCatalogFamilyVisibility(null)
    setFicheCatalogSupTypes(null)
  })
})

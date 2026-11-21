import { afterEach, describe, expect, it } from 'vitest'
import config from '@/lib/config'
import {
  familiesForTerritoryNetworkFetch,
  missingFicheInfoFamilies,
  resolveFicheInfoActiveFamiliesForFetch,
} from '@/lib/fiche/ficheActiveFamilies'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY } from '@/lib/map/mapMode'
import { setFicheCatalogFamilyVisibility } from '@/lib/fiche/ficheCatalogVisibilityFilter'

describe('ficheActiveFamilies', () => {
  afterEach(() => {
    setFicheCatalogFamilyVisibility(null)
    delete (config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl
    delete (config as { apiFicheInfoCatalogFamilies?: boolean }).apiFicheInfoCatalogFamilies
  })

  it('n’envoie que du si seul DU est visible au catalogue', () => {
    ;(config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl = '/api/fiche-info-v2'
    setFicheCatalogFamilyVisibility({
      du: true,
      psmv: false,
      sup: false,
      scot: false,
      mec: false,
    })
    expect(resolveFicheInfoActiveFamiliesForFetch()).toEqual(['du'])
  })

  it('calcule les familles manquantes pour un enrichissement incrémental', () => {
    expect(missingFicheInfoFamilies(['du', 'sup'], ['du'])).toEqual(['sup'])
  })

  it('ajoute du au complément SUP territoire pour le maillage communal', () => {
    setFicheCatalogFamilyVisibility({ du: true, sup: true, scot: false, psmv: false, mec: false })
    expect(familiesForTerritoryNetworkFetch(['sup'], MAP_MODE_TERRITORY)).toEqual(['sup', 'du'])
    expect(familiesForTerritoryNetworkFetch(['sup'], MAP_MODE_PARCEL)).toEqual(['sup'])
  })
})

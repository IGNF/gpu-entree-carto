import { afterEach, describe, expect, it } from 'vitest'
import config from '@/lib/config'
import {
  missingFicheInfoFamilies,
  resolveFicheInfoActiveFamiliesForFetch,
} from '@/lib/fiche/ficheActiveFamilies'
import {
  setFicheCatalogFamilyVisibility,
  setFicheSupInZoomRange,
} from '@/lib/fiche/ficheCatalogVisibilityFilter'

describe('ficheActiveFamilies', () => {
  afterEach(() => {
    setFicheCatalogFamilyVisibility(null)
    setFicheSupInZoomRange(null)
    delete (config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl
    delete (config as { apiFicheInfoCatalogFamilies?: boolean }).apiFicheInfoCatalogFamilies
  })

  it('n’envoie que du si seul DU est visible au catalogue', () => {
    ;(config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl = '/api/fiche-info'
    setFicheCatalogFamilyVisibility({
      du: true,
      psmv: false,
      sup: false,
      scot: false,
      mec: false,
    })
    expect(resolveFicheInfoActiveFamiliesForFetch()).toEqual(['du'])
  })

  it('envoie du même sans couche DU cochée (MEC au point, bouton fiche parcelle)', () => {
    setFicheCatalogFamilyVisibility({ du: false, psmv: false, sup: false, scot: false, mec: false })
    expect(resolveFicheInfoActiveFamiliesForFetch()).toEqual(['du'])
  })

  it('ajoute sup et scot quand leurs couches sont cochées', () => {
    setFicheCatalogFamilyVisibility({ du: true, psmv: false, sup: true, scot: true, mec: false })
    expect(resolveFicheInfoActiveFamiliesForFetch()).toEqual(['du', 'sup', 'scot'])
  })

  it('n’envoie pas sup hors de la plage de zoom de la couche SUP', () => {
    setFicheCatalogFamilyVisibility({ du: true, psmv: false, sup: true, scot: false, mec: false })
    setFicheSupInZoomRange(false)
    expect(resolveFicheInfoActiveFamiliesForFetch()).toEqual(['du'])
  })

  it('envoie toutes les familles si le filtrage par catalogue est désactivé', () => {
    ;(config as { apiFicheInfoCatalogFamilies?: boolean }).apiFicheInfoCatalogFamilies = false
    setFicheCatalogFamilyVisibility({ du: true, psmv: false, sup: false, scot: false, mec: false })
    expect(resolveFicheInfoActiveFamiliesForFetch()).toEqual(['du', 'sup', 'scot'])
  })

  it('calcule les familles manquantes pour un enrichissement incrémental', () => {
    expect(missingFicheInfoFamilies(['du', 'sup'], ['du'])).toEqual(['sup'])
  })
})

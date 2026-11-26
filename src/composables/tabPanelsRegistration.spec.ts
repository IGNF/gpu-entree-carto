import { describe, expect, it } from 'vitest'
import {
  registerTabPanelsApi,
  tabPanelsApiRef,
  unregisterTabPanelsApi,
  type TabPanelsApi,
} from '@/composables/tabPanels'
import {
  mapPrintPanelsRef,
  registerMapPrintPanels,
  unregisterMapPrintPanels,
  type MapPrintPanelsContext,
} from '@/map/mapPrintPanelsContext'
import {
  mapPermalinkLayersBridgeRef,
  registerMapPermalinkLayersBridge,
  unregisterMapPermalinkLayersBridge,
  type MapPermalinkLayersBridge,
} from '@/composables/mapPermalinkLayersBridge'

/**
 * Changement d’onglet entre deux cartes avec panneau (ex. Carte → Fiche territoire) : le panneau de la page
 * suivante s’enregistre avant le démontage du précédent, qui ne doit pas effacer l’enregistrement suivant.
 */
describe('désenregistrement du panneau : seulement s’il est encore l’enregistré', () => {
  it('panneau (fiche)', () => {
    const previous = {} as TabPanelsApi
    const next = {} as TabPanelsApi
    registerTabPanelsApi(previous)
    registerTabPanelsApi(next)
    unregisterTabPanelsApi(previous)
    expect(tabPanelsApiRef.value).toBe(next)
    unregisterTabPanelsApi(next)
    expect(tabPanelsApiRef.value).toBeNull()
  })

  it('contexte d’impression', () => {
    const previous = {} as MapPrintPanelsContext
    const next = {} as MapPrintPanelsContext
    registerMapPrintPanels(previous)
    registerMapPrintPanels(next)
    unregisterMapPrintPanels(previous)
    expect(mapPrintPanelsRef.value).toBe(next)
  })

  it('passerelle couches ↔ permalien', () => {
    const previous = {} as MapPermalinkLayersBridge
    const next = {} as MapPermalinkLayersBridge
    registerMapPermalinkLayersBridge(previous)
    registerMapPermalinkLayersBridge(next)
    unregisterMapPermalinkLayersBridge(previous)
    expect(mapPermalinkLayersBridgeRef.value).toBe(next)
  })
})

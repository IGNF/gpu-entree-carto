/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OlMap from 'ol/Map'
import View from 'ol/View'

const refresh = vi.hoisted(() => vi.fn())
const ensure = vi.hoisted(() => vi.fn())
const fit = vi.hoisted(() => vi.fn())
vi.mock('@/lib/map/animateViewFit', () => ({ animateViewFit: fit }))
vi.mock('@/lib/fiche/ficheInfoService', () => ({ refreshFicheForMapModeChange: refresh }))
vi.mock('@/lib/map/searchResultGraphics', () => ({
  empriseTargetKeyForModeFocus: () => 'k',
  ensureModeEmpriseForMapPointAsync: ensure,
  modeEmpriseViewExtent: () => null,
  readCherryOrModeEmprisePoint: () => null,
  searchEngineLayerHostRef: { value: null },
}))

import { focusModeEmpriseOnMap } from '@/lib/map/focusModeEmprise'
import { MAP_MODE_PARCEL } from '@/lib/map/mapMode'
import { resetMapPermalinkState, setMapPermalinkMarker } from '@/lib/map/mapPermalink'
import { stubResizeObserver } from '@/test/olJsdom'

stubResizeObserver()

const map = new OlMap({ view: new View({ center: [0, 0], zoom: 12 }) })

beforeEach(() => {
  resetMapPermalinkState()
  setMapPermalinkMarker(3.6869, 43.3925)
})
afterEach(() => vi.clearAllMocks())

describe('focusModeEmpriseOnMap (changement de mode)', () => {
  it('recharge la fiche de la cerise', async () => {
    ensure.mockResolvedValue([0, 0, 10, 10])
    await focusModeEmpriseOnMap(map, MAP_MODE_PARCEL)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('cerise déplacée pendant le calcul de l’emprise (nouvelle interrogation) : pas de rechargement en double', async () => {
    ensure.mockImplementation(() => {
      setMapPermalinkMarker(2.42, 47.88)
      return Promise.resolve([0, 0, 10, 10])
    })
    await focusModeEmpriseOnMap(map, MAP_MODE_PARCEL)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('vue recentrée sur l’emprise par défaut (tags Parcelle / Territoire de la fiche)', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => cb())
    ensure.mockResolvedValue([0, 0, 10, 10])
    await focusModeEmpriseOnMap(map, MAP_MODE_PARCEL)
    expect(fit).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })

  it('skipFit (changement de mode, permalien) : emprise et fiche à jour, vue inchangée', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => cb())
    ensure.mockResolvedValue([0, 0, 10, 10])
    await focusModeEmpriseOnMap(map, MAP_MODE_PARCEL, { skipFit: true })
    expect(ensure).toHaveBeenCalledTimes(1)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fit).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

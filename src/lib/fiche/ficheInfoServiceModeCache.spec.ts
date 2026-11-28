/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import { MAP_MODE_COORDINATES, MAP_MODE_PARCEL } from '@/lib/map/mapMode'

const fetches = vi.hoisted(() => ({
  combined: vi.fn(),
  single: vi.fn(),
}))
vi.mock('@/lib/fiche/ficheInfoFetch', () => ({
  abortInflightFicheInfoFetch: vi.fn(),
  fetchGpuFicheInfoCombinedPayload: fetches.combined,
  fetchGpuFicheInfoPayload: fetches.single,
  wasLastFicheInfoPanelFetchRateLimited: () => false,
}))
vi.mock('@/lib/fiche/ficheInfoApiUrls', async (orig) => ({
  ...(await orig<typeof import('@/lib/fiche/ficheInfoApiUrls')>()),
  preferFicheInfoV2CombinedFetch: () => true,
}))
vi.mock('@/lib/demo/gpuClientConfigState', async (orig) => ({
  ...(await orig<typeof import('@/lib/demo/gpuClientConfigState')>()),
  whenGpuClientConfigReady: (fn: () => void) => fn(),
  waitUntilGpuClientConfigScriptSettled: () => Promise.resolve(),
}))
vi.mock('@/lib/demo/demoConfig', async (orig) => ({
  ...(await orig<typeof import('@/lib/demo/demoConfig')>()),
  syncEntreeConfigFromGpuScript: vi.fn(),
  finalizeGpuClientConfigStateIfInjected: vi.fn(),
}))
vi.mock('@/lib/map/searchResultGraphics', () => ({
  seedModeEmpriseCacheFromFichePayload: vi.fn(),
  syncModeEmpriseToSearchLayer: vi.fn(),
}))

import config from '@/lib/config'
import { loadFicheForMapPoint } from '@/lib/fiche/ficheInfoService'

const parcel = { id: '31_526_000_000_AC_0260', section: 'AC', numero: '0260', code_insee: '31526' }
const parcelFiche = { features: [{ id: 'zone_urba.1', properties: { libelle: 'UA' } }] }
const pointFiche = {
  features: [
    { id: 'zone_urba.1', properties: { libelle: 'UA' } },
    { id: 'prescription_surf.9', properties: { libelle: 'Espace boisé classé' } },
  ],
}
const combinedPayload: GpuFicheInfoPayload = {
  parcel,
  parcelId: parcel.id,
  grid: { name: 'LA SALVETAT-SAINT-GILLES', insee: '31526' },
  parcelFiche,
}
const coordinatesPayload: GpuFicheInfoPayload = {
  parcel,
  parcelId: parcel.id,
  grid: { name: 'LA SALVETAT-SAINT-GILLES', insee: '31526' },
  pointFiche,
}

const at = { lon: 1.27162, lat: 43.57951, zoom: 17, silent: true }
const ficheOf = (raw: unknown) => (raw as Record<string, unknown>)._parcelFiche

beforeEach(() => {
  config.apiFicheInfoUrl = '/api/fiche-info'
  fetches.combined.mockReset().mockResolvedValue(structuredClone(combinedPayload))
  fetches.single.mockReset().mockResolvedValue(structuredClone(coordinatesPayload))
})

describe('fiche : cache au point et changement de mode', () => {
  it('Parcelle puis Coordonnées au même point : la route /coordonnees est interrogée, sans mélange', async () => {
    const parcelSel = await loadFicheForMapPoint({ ...at, mode: MAP_MODE_PARCEL })
    expect(ficheOf(parcelSel?.raw)).toEqual(parcelFiche)

    const coordSel = await loadFicheForMapPoint({ ...at, mode: MAP_MODE_COORDINATES })
    expect(fetches.single).toHaveBeenCalledWith(
      expect.objectContaining({ mode: MAP_MODE_COORDINATES }),
    )
    expect(ficheOf(coordSel?.raw)).toEqual(pointFiche)

    // Retour en Parcelle : fiche en cache, intacte (pas de règles au point fusionnées).
    const again = await loadFicheForMapPoint({ ...at, mode: MAP_MODE_PARCEL })
    expect(fetches.combined).toHaveBeenCalledTimes(1)
    expect(ficheOf(again?.raw)).toEqual(parcelFiche)
  })

  it('Coordonnées puis Parcelle au même point : la requête combinée est faite', async () => {
    const other = { ...at, lon: 2.5 } // autre point : cache du test précédent écarté
    await loadFicheForMapPoint({ ...other, mode: MAP_MODE_COORDINATES })
    const parcelSel = await loadFicheForMapPoint({ ...other, mode: MAP_MODE_PARCEL })
    expect(fetches.combined).toHaveBeenCalledTimes(1)
    expect(ficheOf(parcelSel?.raw)).toEqual(parcelFiche)
  })
})

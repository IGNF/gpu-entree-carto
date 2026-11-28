/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import config from '@/lib/config'
import { resolveFicheInfoFetchUrl } from '@/lib/fiche/ficheInfoApiUrls'
import { ficheSelectionFromGpuApi, type GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import { MAP_MODE_COORDINATES, normalizeMapMode } from '@/lib/map/mapMode'

afterEach(() => {
  delete config.apiFicheInfoUrl
  delete config.apiFicheInfoCoordonneesUrl
})

describe('mode Coordonnées', () => {
  it('identifiant de mode 3 (permalien `mode=3`)', () => {
    expect(MAP_MODE_COORDINATES).toBe(3)
    expect(normalizeMapMode('3')).toBe(3)
    expect(normalizeMapMode(3)).toBe(3)
    expect(normalizeMapMode('4')).toBeNull()
  })

  it('API : route /coordonnees (dérivée de apiFicheInfoUrl, ou URL explicite de la config)', () => {
    config.apiFicheInfoUrl = '/api/fiche-info'
    expect(resolveFicheInfoFetchUrl(MAP_MODE_COORDINATES)).toBe('/api/fiche-info/coordonnees')
    config.apiFicheInfoCoordonneesUrl = '/autre/coordonnees'
    expect(resolveFicheInfoFetchUrl(MAP_MODE_COORDINATES)).toBe('/autre/coordonnees')
  })

  it('fiche : règles au point (pointFiche), titre « Coordonnées », lon/lat, bascules parcelle et commune', () => {
    const data: GpuFicheInfoPayload = {
      parcel: { id: '31_526_000_000_AC_0260', section: 'AC', numero: '0260', code_insee: '31526' },
      parcelId: '31_526_000_000_AC_0260',
      grid: { name: 'LA SALVETAT-SAINT-GILLES', insee: '31526' },
      pointFiche: {
        features: [
          {
            id: 'zone_urba.84586',
            properties: { libelle: 'N', typezone: 'N', partition: 'DU_31526' },
          },
        ],
      },
    }
    const sel = ficheSelectionFromGpuApi(data, MAP_MODE_COORDINATES, 1.27162, 43.57951)
    expect(sel.mapMode).toBe(MAP_MODE_COORDINATES)
    expect(sel.title).toBe('Coordonnées')
    expect(sel.coordinatesLabel).toBe('Longitude 1.27162, latitude 43.57951')
    expect(sel.cadastreReferences).toBeNull()
    expect(sel.parcelSwitchLabel).toBe('AC 0260')
    expect(sel.territoryTitle).toContain('(31526)')
    expect((sel.raw as Record<string, unknown>)._parcelFiche).toEqual(data.pointFiche)
    expect((sel.raw as Record<string, unknown>).mode).toBe(MAP_MODE_COORDINATES)
  })
})

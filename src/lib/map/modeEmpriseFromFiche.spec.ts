import { describe, expect, it } from 'vitest'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY } from '@/lib/map/mapMode'
import { modeEmprisePartsFromFichePayload } from '@/lib/map/modeEmpriseFromFiche'
import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'

const point = { type: 'Point' as const, coordinates: [1, 2] }

describe('modeEmprisePartsFromFichePayload', () => {
  it('extrait la parcelle', () => {
    const payload: GpuFicheInfoPayload = { parcelGeometry: point }
    const parts = modeEmprisePartsFromFichePayload(payload, MAP_MODE_PARCEL)
    expect(parts).toEqual([{ kind: 'parcel', geometry: point }])
  })

  it('extrait commune + arrondissement à Paris', () => {
    const payload: GpuFicheInfoPayload = {
      grid: { insee: '75101' },
      parentGridGeometry: { type: 'Polygon', coordinates: [] },
      gridGeometry: { type: 'Polygon', coordinates: [[[0, 0]]] },
    }
    const parts = modeEmprisePartsFromFichePayload(payload, MAP_MODE_TERRITORY)
    expect(parts.map((p) => p.kind)).toEqual(['commune', 'arrondissement'])
  })

  it('extrait une seule commune hors arrondissements', () => {
    const payload: GpuFicheInfoPayload = {
      grid: { insee: '62193' },
      gridGeometry: { type: 'Polygon', coordinates: [[[0, 0]]] },
    }
    const parts = modeEmprisePartsFromFichePayload(payload, MAP_MODE_TERRITORY)
    expect(parts).toEqual([{ kind: 'commune', geometry: payload.gridGeometry }])
  })

  it('gpu-site main : géométrie de la commune dans grid.feature.geometry', () => {
    const geometry = { type: 'MultiPolygon' as const, coordinates: [[[[1.25, 43.57]]]] }
    const payload: GpuFicheInfoPayload = { grid: { insee: '31526', feature: { geometry } } }
    expect(modeEmprisePartsFromFichePayload(payload, MAP_MODE_TERRITORY)).toEqual([
      { kind: 'commune', geometry },
    ])
  })

  it('gridGeometry (gpu-site dsfr) prioritaire sur grid.feature.geometry', () => {
    const gridGeometry = { type: 'Polygon' as const, coordinates: [[[0, 0]]] }
    const payload: GpuFicheInfoPayload = {
      grid: { insee: '31526', feature: { geometry: point } },
      gridGeometry,
    }
    expect(modeEmprisePartsFromFichePayload(payload, MAP_MODE_TERRITORY)).toEqual([
      { kind: 'commune', geometry: gridGeometry },
    ])
  })
})

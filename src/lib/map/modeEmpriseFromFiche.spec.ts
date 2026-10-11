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
})

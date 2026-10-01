import { describe, expect, it } from 'vitest'
import {
  resolveInseeForCadastre,
  resolveTyperefForCadastre,
} from '@/lib/fiche/cadastreLowFromFicheInfo'
import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'

describe('cadastreLowFromFicheInfo', () => {
  it('utilise typeref racine de la fiche', () => {
    const data: GpuFicheInfoPayload = { typeref: '01', grid: { insee: '75101' } }
    expect(resolveTyperefForCadastre(data)).toBe('01')
  })

  it('retombe sur le DU en production', () => {
    const data: GpuFicheInfoPayload = {
      grid: { insee: '86050' },
      dus: {
        p1: {
          documents: [{ status: 'document.production', typeref: '02' }],
        },
      },
    }
    expect(resolveTyperefForCadastre(data)).toBe('02')
  })

  it('résout INSEE depuis grid puis parcelle', () => {
    expect(resolveInseeForCadastre({ grid: { insee: '85082' } })).toBe('85082')
    expect(resolveInseeForCadastre({ parcel: { code_insee: '19203' } })).toBe('19203')
  })
})

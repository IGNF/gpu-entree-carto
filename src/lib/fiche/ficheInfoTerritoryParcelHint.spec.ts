import { describe, expect, it } from 'vitest'
import { mergeParcelHintIntoTerritoryPayload } from '@/lib/fiche/ficheInfoTerritoryParcelHint'

describe('mergeParcelHintIntoTerritoryPayload', () => {
  it('ajoute parcel / parcelId depuis la réponse parcelle sans écraser le territoire', () => {
    const territory = {
      grid: { name: 'COMMUNE', insee: '95197' },
      dus: { DU_95197: { documents: [{ title: 'PLU' }] } },
    }
    const parcelScope = {
      parcel: { section: 'AK', numero: '0432', idu: '95197000AK0432' },
      parcelId: '95197000AK0432',
      dus: { DU_OTHER: { documents: [{ title: 'Autre' }] } },
    }
    const merged = mergeParcelHintIntoTerritoryPayload(territory, parcelScope)
    expect(merged.dus).toEqual(territory.dus)
    expect(merged.parcel).toEqual(parcelScope.parcel)
    expect(merged.parcelId).toBe('95197000AK0432')
  })

  it('ne modifie pas le territoire si la parcelle y est déjà', () => {
    const territory = {
      parcel: { section: 'A', numero: '1' },
      grid: { insee: '12345' },
    }
    const parcelScope = { parcel: { section: 'B', numero: '2' } }
    expect(mergeParcelHintIntoTerritoryPayload(territory, parcelScope)).toBe(territory)
  })
})

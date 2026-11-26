import { describe, expect, it } from 'vitest'
import { mergeGpuFicheInfoPayloads } from '@/lib/fiche/ficheInfoPayloadMerge'

describe('mergeGpuFicheInfoPayloads : alerte EL9', () => {
  it('un complément sans sup (is_el9_alert null) conserve l’alerte déjà connue', () => {
    const merged = mergeGpuFicheInfoPayloads({ is_el9_alert: true }, { is_el9_alert: null })
    expect(merged.is_el9_alert).toBe(true)
  })

  it('un complément avec sup remplace la valeur', () => {
    expect(
      mergeGpuFicheInfoPayloads({ is_el9_alert: true }, { is_el9_alert: false }).is_el9_alert,
    ).toBe(false)
    expect(mergeGpuFicheInfoPayloads({}, { is_el9_alert: true }).is_el9_alert).toBe(true)
  })
})

describe('mergeGpuFicheInfoPayloads : documents petite échelle', () => {
  const doc = { id: 'abc', name: 'DU_01001' }

  it('un complément sans du (lowScaleDocument vide) conserve les documents connus', () => {
    expect(
      mergeGpuFicheInfoPayloads({ lowScaleDocument: [doc] }, { lowScaleDocument: [] })
        .lowScaleDocument,
    ).toEqual([doc])
    expect(
      mergeGpuFicheInfoPayloads({ lowScaleDocument: [doc] }, { lowScaleDocument: {} })
        .lowScaleDocument,
    ).toEqual([doc])
  })

  it('un complément avec documents les remplace', () => {
    const other = { id: 'def', name: 'DU_01002' }
    expect(
      mergeGpuFicheInfoPayloads({ lowScaleDocument: [doc] }, { lowScaleDocument: [other] })
        .lowScaleDocument,
    ).toEqual([other])
  })
})

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  isFicheProcedureVisibleForDocumentKey,
  uniqueDocumentKeyFamilies,
} from '@/lib/fiche/ficheProcedureCatalogFamilies'
import { setFicheCatalogFamilyVisibility } from '@/lib/fiche/ficheCatalogVisibilityFilter'
import { setMapPermalinkParams } from '@/lib/map/mapPermalink'

describe('uniqueDocumentKeyFamilies', () => {
  it('SCOT depuis la clé ou le type', () => {
    expect(uniqueDocumentKeyFamilies('200051183_SCOT_20251010')).toEqual(['scot'])
    expect(uniqueDocumentKeyFamilies('200051910_SCoT_R_00000000')).toEqual(['scot'])
    expect(uniqueDocumentKeyFamilies('x', 'SCOT')).toEqual(['scot'])
  })

  it('SUP depuis la clé', () => {
    expect(uniqueDocumentKeyFamilies('172014607_SUP_31_AC1')).toEqual(['sup'])
  })

  it('PSMV depuis la clé ou le type', () => {
    expect(uniqueDocumentKeyFamilies('12345_PSMV_20200101')).toEqual(['psmv'])
    expect(uniqueDocumentKeyFamilies('x', 'PSMV')).toEqual(['psmv'])
  })

  it('DU par défaut', () => {
    expect(uniqueDocumentKeyFamilies('95197_PLU_20200121')).toEqual(['du'])
  })
})

describe('isFicheProcedureVisibleForDocumentKey', () => {
  beforeEach(() => {
    setMapPermalinkParams({
      'dev-du': '1:0.7:0:0:1',
      'dev-scot': '1:0.7:0:0:1',
      'dev-mec': '1:0.7:0:0:1',
    })
    setFicheCatalogFamilyVisibility(null)
  })

  afterEach(() => {
    setMapPermalinkParams({})
    setFicheCatalogFamilyVisibility(null)
  })

  it('SCOT masqué au catalogue → procédure SCOT invisible', () => {
    setFicheCatalogFamilyVisibility({
      du: true,
      psmv: true,
      sup: true,
      scot: false,
      mec: true,
    })
    expect(isFicheProcedureVisibleForDocumentKey('200051183_SCOT_20251010')).toBe(false)
    expect(isFicheProcedureVisibleForDocumentKey('200051910_SCoT_R_00000000')).toBe(false)
  })

  it('MEC DU : DU et MEC doivent être visibles', () => {
    setFicheCatalogFamilyVisibility({
      du: false,
      psmv: true,
      sup: true,
      scot: true,
      mec: true,
    })
    expect(isFicheProcedureVisibleForDocumentKey('MEC_1_DU_95197_PLU_20200121')).toBe(false)
  })
})

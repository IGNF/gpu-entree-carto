import { describe, expect, it } from 'vitest'
import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import {
  documentNameAffectedByMec,
  documentPartitionKeyFromMecPartition,
  mecNoticeHtmlForDocumentName,
  mecProcedureTileHtmlFromGpuDocument,
} from '@/lib/fiche/ficheMecPresentation'

describe('documentPartitionKeyFromMecPartition', () => {
  it('retire le préfixe MEC_n_', () => {
    expect(documentPartitionKeyFromMecPartition('MEC_12_DU_12345_20240101')).toBe(
      'DU_12345_20240101',
    )
  })

  it('retire le préfixe MEC_ sans numéro', () => {
    expect(documentPartitionKeyFromMecPartition('MEC_DU_31526')).toBe('DU_31526')
  })
})

describe('mecProcedureTileHtmlFromGpuDocument', () => {
  it('utilise le badge procédure et la notice en détail', () => {
    const id = 'a'.repeat(32)
    const html = mecProcedureTileHtmlFromGpuDocument({
      id,
      title: 'MEC test',
      archiveUrl: `http://example.test/api/document/${id}/download/mec.zip`,
    })
    expect(html).toContain(`/document/${id}`)
    expect(html).not.toContain('/download/')
    expect(html).toContain('ec-fiche-info__badge--procedure')
    expect(html).toContain('EN COURS DE PROCÉDURE')
    expect(html).toContain('compatibilit')
    expect(html).not.toContain('ec-fiche-info__badge--vigueur')
  })
})

describe('documentNameAffectedByMec', () => {
  const nonExecutoireOnly: GpuFicheInfoPayload = {
    mecsDu: [],
    mecsScot: [],
    notUnforceableByDocument: { '95197_PLU_20251224': true },
    proceduresByDocument: {
      '95197_PLU_20251224': [{ documentNotEnforceable: true, inProgress: false }],
    },
  }

  it('ignore notUnforceableByDocument (non exécutoire ≠ MEC)', () => {
    expect(documentNameAffectedByMec(nonExecutoireOnly, '95197_PLU_20251224', 'DU_95197')).toBe(
      false,
    )
    expect(mecNoticeHtmlForDocumentName(nonExecutoireOnly, '95197_PLU_20251224', 'DU_95197')).toBe(
      undefined,
    )
  })

  it('ignore une partition MEC sans document gpu-site (WFS seul)', () => {
    const wfsOnly: GpuFicheInfoPayload = {
      mecsDu: {
        MEC_1_DU_95197_PLU_20251224: {
          documents: [{ title: 'MEC WFS', status: 'document.production' }],
        },
      },
    }
    expect(documentNameAffectedByMec(wfsOnly, '95197_PLU_20251224', 'DU_95197')).toBe(false)
  })

  it('affiche la notice si une partition MEC cible le document', () => {
    const gpuId = 'a'.repeat(32)
    const withMec: GpuFicheInfoPayload = {
      mecsDu: {
        MEC_1_DU_95197_PLU_20251224: {
          documents: [{ id: gpuId, title: 'MEC test', status: 'document.production' }],
        },
      },
    }
    expect(documentNameAffectedByMec(withMec, '95197_PLU_20251224', 'DU_95197')).toBe(true)
    expect(mecNoticeHtmlForDocumentName(withMec, '95197_PLU_20251224')).toContain('compatibilit')
  })

  it('ne matche pas un autre document de la commune', () => {
    const withMec: GpuFicheInfoPayload = {
      mecsDu: {
        MEC_1_DU_95197_PLU_20200121: {
          documents: [{ id: 'b'.repeat(32), title: 'MEC', status: 'document.production' }],
        },
      },
    }
    expect(documentNameAffectedByMec(withMec, '95197_PLU_20251224', 'DU_95197')).toBe(false)
  })
})

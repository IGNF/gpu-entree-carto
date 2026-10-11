import { describe, expect, it } from 'vitest'
import {
  lastApprovedProcedureTileDetail,
  procedureNaturePhraseForTileDetail,
  resolveLastApprovedProcedureNatureLabel,
} from '@/lib/fiche/ficheDocumentPresentation'

describe('procedureNaturePhraseForTileDetail', () => {
  it('utilise d’ devant voyelle', () => {
    expect(procedureNaturePhraseForTileDetail('Elaboration')).toBe("Procédure d'elaboration")
    expect(procedureNaturePhraseForTileDetail('Élaboration')).toBe("Procédure d'élaboration")
  })

  it('utilise de devant consonne', () => {
    expect(procedureNaturePhraseForTileDetail('Mise à jour n°2')).toBe(
      'Procédure de mise à jour n°2',
    )
    expect(procedureNaturePhraseForTileDetail('Révision')).toBe('Procédure de révision')
  })
})

describe('lastApprovedProcedureTileDetail', () => {
  it('affiche nature et date quand les deux sont connues', () => {
    expect(lastApprovedProcedureTileDetail('28/09/2023', 'Mise à jour n°2')).toBe(
      'Procédure de mise à jour n°2 approuvée le 28/09/2023',
    )
    expect(lastApprovedProcedureTileDetail('24/12/2025', 'Elaboration')).toBe(
      "Procédure d'elaboration approuvée le 24/12/2025",
    )
  })

  it('conserve le libellé historique sans nature', () => {
    expect(lastApprovedProcedureTileDetail('28/09/2023', null)).toBe(
      'Dernière procédure approuvée le : 28/09/2023',
    )
  })
})

describe('resolveLastApprovedProcedureNatureLabel', () => {
  it('priorise typeproc_title du document', () => {
    expect(
      resolveLastApprovedProcedureNatureLabel(
        { originalName: '95197_PLU_20200121', typeproc_title: 'Élaboration' },
        {
          '95197_PLU_20200121': [{ inProgress: false, procedureType: { title: 'Révision' } }],
        },
      ),
    ).toBe('Élaboration')
  })

  it('retombe sur la première procédure approuvée', () => {
    expect(
      resolveLastApprovedProcedureNatureLabel(
        { originalName: '95197_PLU_20200121' },
        {
          '95197_PLU_20200121': [
            { inProgress: true, procedureType: { title: 'Révision en cours' } },
            { inProgress: false, procedureType: { title: 'Mise à jour n°2' } },
          ],
        },
      ),
    ).toBe('Mise à jour n°2')
  })
})

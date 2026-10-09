import { describe, expect, it } from 'vitest'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY } from '@/lib/map/mapMode'
import { ficheSelectionFromGpuApi, isGpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'

const samplePayload = {
  parcel: {
    section: 'AK',
    numero: '0432',
    nom_com: 'Deuil-la-Barre',
    code_insee: '95197',
    contenance: 11663,
    idu: '95197000AK0432',
  },
  grid: { name: 'DEUIL-LA-BARRE', insee: '95197' },
  dus: {
    DU_95197: {
      features: [
        {
          typezone: 'U',
          libelle: 'UM',
          libelong: 'Zone urbaine pavillonnaire',
          urlfic: 'https://example.com/plu.pdf',
        },
      ],
      documents: [
        {
          title: "Plan Local d'Urbanisme (PLU) de la commune de DEUIL-LA-BARRE",
          type: 'PLU',
          status: 'document.production',
          originalName: '95197_PLU_20200121',
          typeproc_title: 'Elaboration',
        },
      ],
    },
  },
  sups: {
    SUP_X: {
      features: [{ libelle: 'Servitude test' }],
      documents: [{ title: 'SUP AC1', status: 'document.production', name: 'SUP_X' }],
    },
  },
  scots: [],
  psmvs: {},
  proceduresByDocument: {
    '95197_PLU_20200121': [
      {
        inProgress: true,
        procedureType: { title: 'Révision' },
        documentName: '95197_PLU_20200121',
      },
    ],
  },
}

describe('isGpuFicheInfoPayload', () => {
  it('reconnaît la réponse gpu-site', () => {
    expect(isGpuFicheInfoPayload(samplePayload)).toBe(true)
    expect(isGpuFicheInfoPayload({ title: 'x', bodyHtml: 'y' })).toBe(false)
  })
})

describe('ficheSelectionFromGpuApi', () => {
  it('mode territoire : commune + onglets DU, SUP et procédures', () => {
    const sel = ficheSelectionFromGpuApi(samplePayload, MAP_MODE_TERRITORY, 2.33, 48.96)
    expect(sel.title).toBe('Deuil-la-Barre (95197)')
    expect(sel.territoryTitle).toBe('Deuil-la-Barre (95197)')
    expect(sel.documentTabs?.map((t) => t.id)).toEqual(['du', 'sup', 'procedures'])
    expect(sel.documentTabs?.[0]?.label).toBe('Documents')
    expect(sel.documentTabs?.[0]?.bodyHtml).toContain('Plan Local')
    expect(sel.documentTabs?.[1]?.bodyHtml).toContain('SUP AC1')
  })

  it('mode parcelle : en-tête parcelle, détail différé (gpu_api_parcel_fiche)', () => {
    const sel = ficheSelectionFromGpuApi(samplePayload, MAP_MODE_PARCEL, 2.33, 48.96)
    expect(sel.title).toBe('AK 0432')
    expect(sel.parcelLabel).toBe('AK 0432')
    expect(sel.cadastreReferences?.headline).toContain('AK')
    expect(sel.parcelInfosHtml).toBeUndefined()
    expect(sel.parcelDocumentsHtml).toBeUndefined()
    expect(sel.documentTabs).toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'
import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import {
  buildParcelDocumentsHtmlFromFiche,
  buildParcelInfosHtmlFromFiche,
  isGpuParcelFichePayload,
} from '@/lib/fiche/parcelFicheFromGpuApi'

const sample: Parameters<typeof buildParcelInfosHtmlFromFiche>[0] = {
  features: [
    {
      id: 'zone_urba.1',
      properties: {
        typezone: 'U',
        libelle: 'UM',
        libelong: 'Zone urbaine',
        urlfic: 'https://example.com/reg.pdf#page=12',
      },
    },
    {
      id: 'document.2',
      properties: {
        title: 'PLU Paris',
        status: 'document.production',
        type: 'PLU',
      },
    },
  ],
}

describe('isGpuParcelFichePayload', () => {
  it('requiert features', () => {
    expect(isGpuParcelFichePayload(sample)).toBe(true)
    expect(isGpuParcelFichePayload({ parcel: {} })).toBe(false)
  })
})

describe('buildParcelInfosHtmlFromFiche', () => {
  it('contient une section zonage et une ligne de règle', () => {
    const html = buildParcelInfosHtmlFromFiche(sample)
    expect(html).toContain('ec-fiche-info__rules-section')
    expect(html).toContain('Zonage(s)')
    expect(html).toContain('Zone urbaine')
    expect(html).toContain('ec-fiche-info__rule-row')
    expect(html).toContain('ri-file-pdf-2-line')
    expect(html).toContain('#page=12')
  })
})

describe('buildParcelDocumentsHtmlFromFiche', () => {
  it('liste les features document', () => {
    const html = buildParcelDocumentsHtmlFromFiche(sample)
    expect(html).toContain('fr-tile')
    expect(html).toContain('PLU Paris')
    expect(html).toContain('ec-fiche-info__badge--vigueur')
    expect(html).not.toContain('ec-fiche-info__callout')
  })

  it('encart et badge warning seulement si document non exécutoire', () => {
    const html = buildParcelDocumentsHtmlFromFiche({
      features: [
        {
          id: 'document.1',
          properties: {
            title: 'PLU obsolète',
            status: 'document.production',
            effectiveStatus: 'NON_EXECUTOIRE',
          },
        },
      ],
    })
    expect(html).toContain('ec-fiche-info__callout')
    expect(html).toContain('Certains documents ne sont pas exécutoires')
    expect(html).toContain('ec-fiche-info__badge--non-executoire')
    expect(html).not.toContain('ec-fiche-info__badge--vigueur')
  })

  it('remplace le document DU par une tuile MEC si la parcelle intersecte la MEC', () => {
    const mecId = 'a'.repeat(32)
    const ficheApi: GpuFicheInfoPayload = {
      mecsDu: {
        MEC_2_DU_31526: {
          documents: [
            {
              id: mecId,
              title: 'MEC Centre pénitentiaire',
              status: 'document.production',
            },
          ],
        },
      },
    }
    const html = buildParcelDocumentsHtmlFromFiche(
      {
        features: [
          {
            id: 'document.1',
            properties: {
              name: '31526_PLU_20251013',
              partition: 'DU_31526',
              id: 'b'.repeat(32),
            },
          },
          {
            id: 'mec.57',
            properties: {
              libelle: 'Centre Pénitentiaire',
              partition: 'MEC_2_DU_31526',
            },
          },
        ],
      },
      ficheApi,
    )
    expect(html).toContain('MEC Centre pénitentiaire')
    expect(html).toContain('ec-fiche-info__badge--procedure')
    expect(html).not.toContain('31526_PLU_20251013')
    expect(html).not.toContain('ec-fiche-info__badge--vigueur')
  })

  it('dédoublonne les documents WFS et garde gpu-site + NOT IN BDD', () => {
    const gpuId = '7d74cc6961c2a12233e0e536af7e940d'
    const ficheApi: GpuFicheInfoPayload = {
      dus: {
        DU_31526: {
          documents: [
            {
              id: gpuId,
              originalName: '31526_PLU_20251013',
              name: 'DU_31526',
              title: 'PLU production',
              status: 'document.production',
            },
          ],
        },
      },
    }
    const html = buildParcelDocumentsHtmlFromFiche(
      {
        features: [
          {
            id: 'document.274',
            properties: { name: '31526_PLU_20230420', partition: 'DU_31526', id: 'c'.repeat(32) },
          },
          {
            id: 'document.273',
            properties: { name: '31526_PLU_20230420', partition: 'DU_31526', id: 'd'.repeat(32) },
          },
          {
            id: 'document.291',
            properties: { name: '31526_PLU_20251013', partition: 'DU_31526', id: gpuId },
          },
        ],
      },
      ficheApi,
    )
    expect(html.split('PLU production').length - 1).toBe(1)
    expect(html.split('ec-fiche-info__badge--not-in-bdd').length - 1).toBe(1)
  })

  it('affiche les SUP gpu-site quand une assiette intersecte la parcelle', () => {
    const supId = '3a22781f0cdf36aa622287cdda2305ff'
    const ficheApi: GpuFicheInfoPayload = {
      sups: {
        '172014607_SUP_31_AC1': {
          documents: [
            {
              id: supId,
              name: '172014607_SUP_31_AC1',
              title: 'SUP AC1 test',
              status: 'document.production',
              viewUrl: `/document/${supId}`,
            },
          ],
        },
      },
    }
    const html = buildParcelDocumentsHtmlFromFiche(
      {
        features: [{ id: 'assiette_sup_s.1', properties: { suptype: 'ac1' } }],
      },
      ficheApi,
    )
    expect(html).toContain('Servitudes d’utilité publique')
    expect(html).toContain('SUP AC1 test')
    expect(html).toContain(supId)
  })

  it('badge NON EXÉCUTOIRE via gpu-site si absent du WFS', () => {
    const gpuId = '7d74cc6961c2a12233e0e536af7e940d'
    const ficheApi: GpuFicheInfoPayload = {
      dus: {
        DU_31526: {
          documents: [
            {
              id: gpuId,
              originalName: '31526_PLU_20251013',
              name: 'DU_31526',
              title: 'PLU La Salvetat',
              status: 'document.production',
              effectiveStatus: 'NON_EXECUTOIRE',
              legalStatus: 'APPROVED',
            },
          ],
        },
      },
    }
    const html = buildParcelDocumentsHtmlFromFiche(
      {
        features: [
          {
            id: 'document.291',
            properties: {
              id: gpuId,
              name: '31526_PLU_20251013',
              partition: 'DU_31526',
              du_type: 'PLU',
            },
          },
        ],
      },
      ficheApi,
    )
    expect(html).toContain('ec-fiche-info__badge--non-executoire')
    expect(html).not.toContain('ec-fiche-info__badge--vigueur')
    expect(html).toContain('ec-fiche-info__callout')
  })

  it('SCoT parcelle : une tuile gpu-site avec lien (partition WFS)', () => {
    const gpuId = '75320666e060cde9d822dc388522604d'
    const ficheApi: GpuFicheInfoPayload = {
      scots: {
        scot_200051183: {
          documents: [
            {
              id: gpuId,
              name: 'scot_200051183',
              originalName: '200051183_SCOT_20251010',
              title: 'Schéma de Cohérence Territorial (SCoT) CAEN METROPOLE',
              status: 'document.production',
              effectiveStatus: 'EN_VIGUEUR',
              legalStatus: 'APPROVED',
              viewUrl: `/document/${gpuId}`,
            },
          ],
        },
      },
      mecsScot: {
        MEC_1_scot_200051183: {
          documents: [
            {
              id: '70988e89fab69afbbe73e04615b10d2e',
              title: 'MEC SCoT Caen',
              status: 'document.production',
            },
          ],
        },
      },
    }
    const html = buildParcelDocumentsHtmlFromFiche(
      {
        features: [
          {
            id: 'scot.4799',
            properties: {
              partition: 'scot_200051183',
              gpu_id: '2e7fac47f27a0825cd0091dd1471d985',
              name: 'scot_200051183',
              title: 'SCOT CAEN METROPOLE',
            },
          },
          {
            id: 'scot.4800',
            properties: {
              partition: 'scot_200051183',
              gpu_id: 'd6fff17e8f63fbc0c495aeb97a1f758c',
              name: 'scot_200051183',
              title: 'SCOT CAEN METROPOLE',
            },
          },
        ],
      },
      ficheApi,
    )
    expect(html).toContain('Schéma de Cohérence Territorial (SCoT) CAEN METROPOLE')
    expect(html).toContain('fr-enlarge-link')
    expect(html).toContain(gpuId)
    expect(html).not.toContain('>SCOT CAEN METROPOLE<')
    expect(html.split('Schéma de Cohérence Territorial (SCoT) CAEN METROPOLE').length - 1).toBe(1)
    expect(html).toContain('ec-fiche-info__mec-notice')
    expect(html).toContain('mise en compatibilit')
  })

  it('badge NOT IN BDD si le document WFS est absent de gpu-site', () => {
    const gpuId = 'd'.repeat(32)
    const ficheApi: GpuFicheInfoPayload = {
      dus: {
        DU_31555: {
          documents: [
            { id: gpuId, originalName: '31555_PLU_20200101', name: '31555_PLU_20200101' },
          ],
        },
      },
    }
    const html = buildParcelDocumentsHtmlFromFiche(
      {
        features: [
          {
            id: 'document.1',
            properties: {
              title: 'PLU couche',
              originalName: '99999_PLU_20990101',
              status: 'document.production',
            },
          },
        ],
      },
      ficheApi,
    )
    expect(html).toContain('ec-fiche-info__badge--not-in-bdd')
  })
})

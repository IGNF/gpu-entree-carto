import { afterEach, describe, expect, it, vi } from 'vitest'
import config from '@/lib/config'
import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import {
  buildParcelDocumentsHtmlFromFiche,
  buildParcelInfosHtmlFromFiche,
  fetchGpuParcelFiche,
  isGpuParcelFichePayload,
} from '@/lib/fiche/parcelFicheFromGpuApi'
import { setFicheCatalogFamilyVisibility } from '@/lib/fiche/ficheCatalogVisibilityFilter'
import {
  computeDuRuleCatalogScope,
  resetFicheCatalogLayerScopes,
  setFicheCatalogDuRuleScope,
} from '@/lib/fiche/ficheCatalogLayerScope'
import { layerConfigToCatalogEntries } from '@/lib/layerConfig/gpuLayerConfig'
import duLayerConfigMain from '@/test/fixtures/layer-config/du-gpu-site-main.json'
import sullyFiche from '@/test/fixtures/fiche-info/sully-gpu-site-main.json'

const sampleFicheApi: GpuFicheInfoPayload = {
  dus: {
    DU_SAMPLE: {
      documents: [
        {
          id: 'a'.repeat(32),
          status: 'document.production',
          name: 'DU_SAMPLE',
        },
      ],
    },
  },
}

const sample: Parameters<typeof buildParcelInfosHtmlFromFiche>[0] = {
  features: [
    {
      id: 'zone_urba.1',
      properties: {
        typezone: 'U',
        libelle: 'UM',
        libelong: 'Zone urbaine',
        partition: 'DU_SAMPLE',
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
    const html = buildParcelInfosHtmlFromFiche(sample, undefined, sampleFicheApi)
    expect(html).toContain('ec-fiche-info__rules-section')
    expect(html).toContain('Zonage(s)')
    expect(html).toContain('Zone urbaine')
    expect(html).toContain('ec-fiche-info__rule-row')
    expect(html).toContain('ri-file-pdf-2-line')
    expect(html).toContain('#page=12')
  })

  it('masque le zonage WFS sans document de production gpu-site', () => {
    const html = buildParcelInfosHtmlFromFiche(
      {
        features: [
          {
            id: 'zone_urba.9',
            properties: {
              typezone: 'U',
              libelle: 'UA',
              libelong: 'Zone urbaine centrale',
              partition: 'DU_ORPHELIN',
            },
          },
        ],
      },
      undefined,
      { dus: { DU_ORPHELIN: { documents: [] } } },
    )
    expect(html).toContain('Pas de règle d’urbanisme trouvé')
    expect(html).not.toContain('Zone urbaine centrale')
  })

  it('affiche le zonage lorsque le DU est en production dans la fiche-info API', () => {
    const html = buildParcelInfosHtmlFromFiche(
      {
        features: [
          {
            id: 'zone_urba.9',
            properties: {
              typezone: 'U',
              libelle: 'UA',
              libelong: 'Zone urbaine centrale',
              partition: 'DU_95197',
            },
          },
        ],
      },
      undefined,
      {
        dus: {
          DU_95197: {
            documents: [
              {
                id: 'a'.repeat(32),
                status: 'document.production',
                name: 'DU_95197',
                originalName: '95197_PLU_20200121',
              },
            ],
          },
        },
      },
    )
    expect(html).toContain('Zonage(s)')
    expect(html).toContain('Zone urbaine centrale')
  })
})

describe('buildParcelDocumentsHtmlFromFiche', () => {
  afterEach(() => setFicheCatalogFamilyVisibility(null))
  it('liste les features document présentes en gpu-site', () => {
    const docId = 'a'.repeat(32)
    const ficheApi: GpuFicheInfoPayload = {
      dus: {
        DU_PARIS: {
          documents: [
            {
              id: docId,
              title: 'PLU Paris',
              name: 'DU_PARIS',
              originalName: '75056_PLU_20200101',
              status: 'document.production',
            },
          ],
        },
      },
    }
    const html = buildParcelDocumentsHtmlFromFiche(
      {
        ...sample,
        features: [
          ...(sample.features ?? []),
          {
            id: 'document.3',
            properties: {
              title: 'PLU Paris',
              partition: 'DU_PARIS',
              name: '75056_PLU_20200101',
              id: docId,
              status: 'document.production',
            },
          },
        ],
      },
      ficheApi,
    )
    expect(html).toContain('fr-tile')
    expect(html).toContain('PLU Paris')
    expect(html).toContain('ec-fiche-info__badge--vigueur')
    expect(html).not.toContain('ec-fiche-info__callout')
  })

  it('encart et badge warning seulement si document non exécutoire', () => {
    const docId = 'b'.repeat(32)
    const ficheApi: GpuFicheInfoPayload = {
      dus: {
        DU_TEST: {
          documents: [
            {
              id: docId,
              title: 'PLU obsolète',
              name: 'DU_TEST',
              status: 'document.production',
              effectiveStatus: 'NON_EXECUTOIRE',
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
              title: 'PLU obsolète',
              partition: 'DU_TEST',
              id: docId,
              status: 'document.production',
              effectiveStatus: 'NON_EXECUTOIRE',
            },
          },
        ],
      },
      ficheApi,
    )
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

  it('dédoublonne les documents WFS et n’affiche que la tuile gpu-site', () => {
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
    expect(html).not.toContain('ec-fiche-info__badge--not-in-bdd')
    expect(html).not.toContain('31526_PLU_20230420')
  })

  it('conserve le DU API si SUP coché et aucune feature document WFS', () => {
    setFicheCatalogFamilyVisibility({
      du: true,
      psmv: true,
      sup: true,
      scot: false,
      mec: true,
    })
    const duId = '7d74cc6961c2a12233e0e536af7e940d'
    const supId = '3a22781f0cdf36aa622287cdda2305ff'
    const ficheApi: GpuFicheInfoPayload = {
      dus: {
        DU_31526: {
          documents: [
            {
              id: duId,
              title: 'PLU parcelle',
              name: 'DU_31526',
              status: 'document.production',
            },
          ],
        },
      },
      sups: {
        '172014607_SUP_31_AC1': {
          documents: [
            {
              id: supId,
              title: 'Servitude AC1',
              name: '172014607_SUP_31_AC1',
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
            id: 'assiette_sup_s.1',
            properties: { typepsc: 'AC1', libelle: 'Assiette' },
          },
        ],
      },
      ficheApi,
    )
    expect(html).toContain('PLU parcelle')
    expect(html).toContain('Servitude AC1')
  })

  it('n’affiche pas les SUP communales sans assiette à la parcelle', () => {
    const ficheApi: GpuFicheInfoPayload = {
      sups: {
        '172014607_SUP_31_AC1': {
          documents: [
            {
              id: '3a22781f0cdf36aa622287cdda2305ff',
              name: '172014607_SUP_31_AC1',
              title: 'SUP AC1 communal',
              status: 'document.production',
            },
          ],
        },
      },
    }
    const infos = buildParcelInfosHtmlFromFiche(
      { features: [{ id: 'zone_urba.1', properties: { libelle: 'Ua' } }] },
      undefined,
      ficheApi,
    )
    const docs = buildParcelDocumentsHtmlFromFiche(
      { features: [{ id: 'zone_urba.1', properties: { libelle: 'Ua' } }] },
      ficheApi,
    )
    expect(infos).not.toContain('Servitudes d’utilité publique')
    expect(docs).not.toContain('SUP AC1 communal')
    expect(docs).not.toContain('Servitudes d’utilité publique')
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

  it('SCoT parcelle : une tuile seulement si gpu_id WFS = id document BDD', () => {
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
              gpu_id: gpuId,
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

  it('SCoT parcelle : pas de tuile si gpu_id WFS ≠ id document BDD', () => {
    const ficheApi: GpuFicheInfoPayload = {
      scots: {
        scot_200051183: {
          documents: [
            {
              id: '1e30ef3ade30fcbded0a16648a39432d',
              name: 'scot_200051183',
              title: 'SCoT',
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
            },
          },
        ],
      },
      ficheApi,
    )
    expect(html).not.toContain('Schémas de cohérence territoriale')
  })

  it('ignore les features WFS sans entrée gpu-site', () => {
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
    expect(html).not.toContain('ec-fiche-info__badge--not-in-bdd')
    expect(html).not.toContain('PLU couche')
  })

  it('masque une MEC SCoT WFS sans document gpu-site (Infos + Documents)', () => {
    const ficheApi: GpuFicheInfoPayload = {
      mecsScot: {
        MEC_1_scot_200051183: { documents: [] },
      },
    }
    const payload = {
      features: [
        {
          id: 'mec.20',
          properties: {
            libelle: 'Centre Pénitentiaire scot',
            partition: 'MEC_1_scot_200051183',
          },
        },
      ],
    }
    const infos = buildParcelInfosHtmlFromFiche(payload, undefined, ficheApi)
    expect(infos).not.toContain('Centre Pénitentiaire')
    expect(infos).not.toContain('Mises en compatibilité')
    const docs = buildParcelDocumentsHtmlFromFiche(payload, ficheApi)
    expect(docs).not.toContain('Centre Pénitentiaire')
  })

  it('masque une MEC SCoT en Infos quand la famille SCoT est décochée au catalogue', () => {
    setFicheCatalogFamilyVisibility({
      du: true,
      psmv: false,
      sup: true,
      scot: false,
      mec: true,
    })
    const mecId = 'b'.repeat(32)
    const ficheApi: GpuFicheInfoPayload = {
      mecsScot: {
        MEC_1_scot_200051183: {
          documents: [{ id: mecId, title: 'MEC SCoT', status: 'document.production' }],
        },
      },
    }
    const html = buildParcelInfosHtmlFromFiche(
      {
        features: [
          {
            id: 'mec.20',
            properties: {
              libelle: 'Centre Pénitentiaire',
              partition: 'MEC_1_scot_200051183',
            },
          },
        ],
      },
      undefined,
      ficheApi,
    )
    expect(html).not.toContain('Centre Pénitentiaire')
    setFicheCatalogFamilyVisibility(null)
  })
})

describe('onglet Documents de la fiche parcelle : familles du catalogue', () => {
  afterEach(() => setFicheCatalogFamilyVisibility(null))

  const docId = 'c'.repeat(32)
  const ficheApi: GpuFicheInfoPayload = {
    dus: {
      DU_31526: {
        documents: [
          {
            id: docId,
            title: 'PLU La Salvetat',
            name: 'DU_31526',
            status: 'document.production',
            effectiveStatus: 'NON_EXECUTOIRE',
          },
        ],
      },
    },
  }
  const parcelFiche = {
    features: [
      {
        id: 'document.1',
        properties: {
          title: 'PLU La Salvetat',
          partition: 'DU_31526',
          id: docId,
          status: 'document.production',
        },
      },
    ],
  }
  const visibility = (du: boolean) =>
    setFicheCatalogFamilyVisibility({ du, psmv: du, sup: true, scot: true, mec: true })

  it('DU décochés (vues d’ensemble et détaillée) : ni tuile DU ni encart non exécutoire', () => {
    visibility(false)
    const html = buildParcelDocumentsHtmlFromFiche(parcelFiche, ficheApi)
    expect(html).not.toContain('PLU La Salvetat')
    expect(html).not.toContain('ec-fiche-info__callout')
  })

  it('DU cochés : tuile DU affichée', () => {
    visibility(true)
    expect(buildParcelDocumentsHtmlFromFiche(parcelFiche, ficheApi)).toContain('PLU La Salvetat')
  })
})

describe('onglet Documents de la fiche parcelle : servitude de passage sur le littoral (EL9)', () => {
  afterEach(() => setFicheCatalogFamilyVisibility(null))

  it('parcelle dans la zone d’alerte (is_el9_alert) : section SUP avec la tuile EL9', () => {
    setFicheCatalogFamilyVisibility(null)
    const html = buildParcelDocumentsHtmlFromFiche({ features: [] }, { is_el9_alert: true })
    expect(html).toContain('Servitudes d’utilité publique')
    expect(html).toContain('legifrance.gouv.fr')
  })

  it('hors zone d’alerte : pas de tuile EL9', () => {
    setFicheCatalogFamilyVisibility(null)
    const html = buildParcelDocumentsHtmlFromFiche({ features: [] }, { is_el9_alert: false })
    expect(html).not.toContain('legifrance.gouv.fr')
  })

  it('SUP décochées dans le catalogue : pas de tuile EL9', () => {
    setFicheCatalogFamilyVisibility({ du: true, psmv: true, sup: false, scot: true, mec: true })
    const html = buildParcelDocumentsHtmlFromFiche({ features: [] }, { is_el9_alert: true })
    expect(html).not.toContain('legifrance.gouv.fr')
  })
})

describe('onglet Documents de la fiche parcelle : liens des tuiles', () => {
  afterEach(() => setFicheCatalogFamilyVisibility(null))

  const plu = (inDatabase: boolean) => ({
    features: [
      {
        id: 'document.1',
        properties: {
          title: 'PLU de test',
          partition: 'DU_31526',
          name: 'DU_31526',
          gpu_id: 'f'.repeat(32),
          urlfic: 'https://example.com/plu.zip',
          inDatabase,
        },
      },
    ],
  })

  it('document hors base : ni archive ni urlfic exposés', () => {
    setFicheCatalogFamilyVisibility(null)
    const html = buildParcelDocumentsHtmlFromFiche(plu(false), {})
    expect(html).not.toContain('example.com')
  })

  it('document en base : lien vers la page du document', () => {
    setFicheCatalogFamilyVisibility(null)
    const html = buildParcelDocumentsHtmlFromFiche(plu(true), {})
    expect(html).toContain(`/document/by-id/${'f'.repeat(32)}`)
    expect(html).not.toContain('example.com')
  })
})

describe('règles d’urbanisme SUP : document en base requis (comme les DU)', () => {
  afterEach(() => setFicheCatalogFamilyVisibility(null))

  const supFeature = {
    id: 'assiette_sup_s.185691',
    properties: {
      suptype: 'ac1',
      partition: '172014607_SUP_44_AC1',
      typeass: 'Périmètre des abords',
      nomass: 'AC1_La-Touche-IFIL0B_abor',
    },
  }
  const ficheApi = (documents: Array<Record<string, unknown>>): GpuFicheInfoPayload => ({
    sups: { '172014607_SUP_44_AC1': { documents } },
  })

  it('SUP sur la carte sans document en production dans la base : règle masquée', () => {
    const html = buildParcelInfosHtmlFromFiche({ features: [supFeature] }, undefined, ficheApi([]))
    expect(html).not.toContain('Servitudes d’utilité publique')
  })

  it('SUP avec document en production (lien par la partition) : règle affichée', () => {
    const html = buildParcelInfosHtmlFromFiche(
      { features: [supFeature] },
      undefined,
      ficheApi([
        { id: 'd'.repeat(32), name: '172014607_SUP_44_AC1', status: 'document.production' },
      ]),
    )
    expect(html).toContain('Servitudes d’utilité publique')
  })
})

describe('fetchGpuParcelFiche', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete (config as { apiParcelFicheUrl?: string }).apiParcelFicheUrl
  })

  it('HTTP 429 : « Service temporairement saturé, réessayez. »', async () => {
    ;(config as { apiParcelFicheUrl?: string }).apiParcelFicheUrl =
      '/api/feature-info/parcel/{parcelId}/fiche'
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 429 }))),
    )
    await expect(fetchGpuParcelFiche('750560000AB0001')).rejects.toThrow(
      'Service temporairement saturé, réessayez.',
    )
  })
})

describe('règles d’urbanisme : réponse réelle gpu-site main (Sully-la-Chapelle, AB 0368)', () => {
  const gpu = 'https://www.geoportail-urbanisme.gouv.fr'
  const docFiles = `${gpu}/api/document/1cd9c54a1775550e0f77ff0e1fac59d2/files`

  afterEach(() => {
    resetFicheCatalogLayerScopes()
    delete config.apiDocumentFileUrl
    delete config.urlPlaceholders
  })

  it('catalogue de production tout coché : 8 règles, liens PDF par l’API fichiers', () => {
    const data = sullyFiche as unknown as GpuFicheInfoPayload & { parcelFiche: { features: [] } }
    const entries = layerConfigToCatalogEntries(duLayerConfigMain)
    setFicheCatalogDuRuleScope(
      computeDuRuleCatalogScope(Object.fromEntries(entries.map((e) => [e.id, true])), entries),
    )
    config.apiDocumentFileUrl = `${gpu}/api/document/00000000000000000000000000000000/files/__GPU_FILE_NAME__`
    config.urlPlaceholders = {
      documentId: '00000000000000000000000000000000',
      fileName: '__GPU_FILE_NAME__',
    }
    const html = buildParcelInfosHtmlFromFiche(data.parcelFiche, 17, data)
    expect(html.match(/ec-fiche-info__rule-title/g)?.length).toBe(8)
    expect(html).toContain('Périmètre de droit de préemption urbain')
    expect(html).toContain(`${docFiles}/45340_info_surf_11_00_20180202.pdf`)
    expect(html).toContain(`${docFiles}/45340_reglement_20180202.pdf#page=15`)
    // SCoT sans pièce écrite : pas d’icône PDF.
    expect(html).not.toContain('rule-doc--muted')
    expect(html.match(/ec-fiche-info__rule-doc/g)?.length).toBe(7)
  })

  it('SUP : pièce écrite via `fichier` et le document SUP de la partition', () => {
    config.apiDocumentFileUrl = `${gpu}/api/document/00000000000000000000000000000000/files/__GPU_FILE_NAME__`
    config.urlPlaceholders = {
      documentId: '00000000000000000000000000000000',
      fileName: '__GPU_FILE_NAME__',
    }
    const supId = 'c88982dd1ed196d51cedcd38ff1c39f0'
    const html = buildParcelInfosHtmlFromFiche(
      {
        features: [
          {
            id: 'assiette_sup_s.175462',
            properties: {
              suptype: 'ac1',
              partition: '172014607_SUP_31_AC1',
              fichier: 'AC1_Chateau-IML8LS_20070806_act.pdf',
            },
          },
        ],
      },
      17,
      {
        sups: {
          '172014607_SUP_31_AC1': {
            documents: [{ id: supId, name: '172014607_SUP_31_AC1', status: 'document.production' }],
          },
        },
      },
    )
    expect(html).toContain(`${gpu}/api/document/${supId}/files/AC1_Chateau-IML8LS_20070806_act.pdf`)
  })
})

describe('onglet Documents : MEC remplaçant un SCoT présent en plusieurs entités (Caen, KX 0013)', () => {
  afterEach(() => setFicheCatalogFamilyVisibility(null))

  it('une seule tuile MEC, même avec deux entités SCoT de la partition remplacée', () => {
    setFicheCatalogFamilyVisibility(null)
    const scotFeature = (id: string, gpuId: string) => ({
      id,
      properties: {
        partition: 'scot_200051183',
        gpu_id: gpuId,
        name: 'scot_200051183',
        title: 'SCOT CAEN METROPOLE',
      },
    })
    const html = buildParcelDocumentsHtmlFromFiche(
      {
        features: [
          scotFeature('scot.4799', '2e7fac47f27a0825cd0091dd1471d985'),
          scotFeature('scot.4800', 'd6fff17e8f63fbc0c495aeb97a1f758c'),
          {
            id: 'mec.20',
            properties: {
              partition: 'MEC_1_scot_200051183',
              idurba: '200051183_SCOT_MEC1_20250909',
              libelle: 'Centre Pénitentiaire scot',
            },
          },
        ],
      },
      {
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
      },
    )
    expect(html.split('MEC SCoT Caen').length - 1).toBe(1)
  })
})

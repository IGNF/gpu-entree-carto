import { describe, expect, it, afterEach } from 'vitest'
import type { GpuLayerCatalogEntry } from '@/lib/layerConfig/gpuLayerConfig'
import {
  computeActiveSupTypesFromCatalog,
  computeDuRuleCatalogScope,
  duRuleFeatureMatchesCatalogScope,
  isSupCategoryCatalogVisible,
  resetFicheCatalogLayerScopes,
  setFicheCatalogDuRuleScope,
  setFicheCatalogSupTypes,
} from '@/lib/fiche/ficheCatalogLayerScope'
import { setFicheCatalogFamilyVisibility } from '@/lib/fiche/ficheCatalogVisibilityFilter'
import { layerConfigToCatalogEntries } from '@/lib/layerConfig/gpuLayerConfig'
import duLayerConfigMain from '@/test/fixtures/layer-config/du-gpu-site-main.json'
import duLayerConfigDev from '@/test/fixtures/layer-config/du-gpu-site-dev.json'

describe('ficheCatalogLayerScope — supType', () => {
  afterEach(() => {
    resetFicheCatalogLayerScopes()
    setFicheCatalogFamilyVisibility(null)
  })

  it('agrège supType des couches SUP cochées', () => {
    const entries: GpuLayerCatalogEntry[] = [
      {
        id: 'sup--conservation-du-patrimoine--patrimoine-culturel--monument-historique',
        path: '/sup/conservation_du_patrimoine/patrimoine_culturel/monument_historique',
        config: { name: 'monument_historique', type: 'sup', supType: ['AC1'] },
      },
      {
        id: 'sup--conservation-du-patrimoine--patrimoine-culturel--patrimoine-architectural',
        path: '/sup/conservation_du_patrimoine/patrimoine_culturel/patrimoine_architectural',
        config: { name: 'patrimoine_architectural', type: 'sup', supType: ['AC4', 'AC4bis'] },
      },
    ]
    expect(computeActiveSupTypesFromCatalog({ [entries[0].id]: true }, entries)).toEqual(
      new Set(['AC1']),
    )
    expect(
      computeActiveSupTypesFromCatalog({ [entries[0].id]: true, [entries[1].id]: true }, entries),
    ).toEqual(new Set(['AC1', 'AC4', 'AC4BIS']))
  })

  it('filtre l’affichage SUP par catégorie catalogue', () => {
    setFicheCatalogFamilyVisibility({
      du: false,
      psmv: false,
      sup: true,
      scot: false,
      mec: false,
    })
    setFicheCatalogSupTypes(new Set(['AC1']))
    expect(isSupCategoryCatalogVisible('AC1')).toBe(true)
    expect(isSupCategoryCatalogVisible('AC4')).toBe(false)
  })
})

describe('ficheCatalogLayerScope — règles DU', () => {
  afterEach(() => resetFicheCatalogLayerScopes())

  it('restreint les prescriptions au typepsc coché au catalogue', () => {
    const entries: GpuLayerCatalogEntry[] = [
      {
        id: 'dev-prescription-03',
        path: '/du,psmv/prescriptions/foo/dev-prescription03',
        config: {
          name: 'dev-prescription',
          filterAttribute: 'typepsc',
          filterValue: ['03'],
        },
      },
    ]
    const scope = computeDuRuleCatalogScope({ [entries[0].id]: true }, entries)
    expect(scope?.restricted).toBe(true)
    expect(scope?.prescriptions).toBe(true)
    expect(scope?.prescriptionTypepsc).toEqual(new Set(['03']))

    setFicheCatalogDuRuleScope(scope)
    expect(
      duRuleFeatureMatchesCatalogScope({ properties: { typepsc: '03' } }, 'prescription'),
    ).toBe(true)
    expect(
      duRuleFeatureMatchesCatalogScope({ properties: { typepsc: '07' } }, 'prescription'),
    ).toBe(false)
  })
})

/** Branche DU réelle : noms `du,psmv` (gpu-site main, production) ou préfixés `dev-` (base de dev). */
describe('ficheCatalogLayerScope — catalogue DU réel, tout coché', () => {
  afterEach(() => resetFicheCatalogLayerScopes())

  for (const [name, layerConfig] of [
    ['gpu-site main (production)', duLayerConfigMain],
    ['gpu-site de dev (préfixe dev-)', duLayerConfigDev],
  ] as const) {
    it(`${name} : périmètres d’informations et prescriptions inclus`, () => {
      const entries = layerConfigToCatalogEntries(layerConfig)
      const checked = Object.fromEntries(entries.map((e) => [e.id, true]))
      const scope = computeDuRuleCatalogScope(checked, entries)
      expect(scope?.informations).toBe(true)
      for (const code of ['04', '11', '32', '98']) {
        expect(scope?.informationTypeinf.has(code)).toBe(true)
      }
      expect(scope?.prescriptions).toBe(true)
      expect(scope?.zonage).toBe(true)
    })
  }
})

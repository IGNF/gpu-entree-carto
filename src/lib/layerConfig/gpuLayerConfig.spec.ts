import { describe, expect, it } from 'vitest'
import {
  buildLayerPath,
  layerConfigToCatalogEntries,
  pathToCatalogId,
} from '@/lib/layerConfig/gpuLayerConfig'

describe('gpuLayerConfig paths', () => {
  it('distingue dev-prescription et dev-prescription_psmv malgré le même titre', () => {
    const parentPath = '/dev-du,dev-psmv/prescriptions/qualite'
    const du: Parameters<typeof layerConfigToCatalogEntries>[0] = [
      {
        name: 'dev-prescription',
        title: 'Qualité urbaine et architecturale',
        filterAttribute: 'typepsc',
        filterValue: ['03', '04'],
      },
      {
        name: 'dev-prescription_psmv',
        title: 'Qualité urbaine et architecturale',
        filterAttribute: 'typepsc',
        filterValue: ['03', '04'],
      },
    ]

    const p1 = buildLayerPath(du[0]!, parentPath)
    const p2 = buildLayerPath(du[1]!, parentPath)
    expect(p1).not.toBe(p2)
    expect(pathToCatalogId(p1)).not.toBe(pathToCatalogId(p2))
  })

  it('enregistre deux entrées WMS distinctes dans le registre catalogue', () => {
    const layers = [
      {
        name: 'dev-prescription,dev-prescription_psmv',
        title: 'Qualité urbaine et architecturale',
        virtual: true,
        hideLayers: true,
        filterAttribute: 'typepsc',
        filterValue: ['03'],
        layers: [
          {
            name: 'dev-prescription',
            title: 'Qualité urbaine et architecturale',
            filterAttribute: 'typepsc',
            filterValue: ['03'],
          },
          {
            name: 'dev-prescription_psmv',
            title: 'Qualité urbaine et architecturale',
            filterAttribute: 'typepsc',
            filterValue: ['03'],
          },
        ],
      },
    ]
    const entries = layerConfigToCatalogEntries(layers)
    const names = new Set(
      entries
        .filter((e) => e.config.name === 'dev-prescription' || e.config.name === 'dev-prescription_psmv')
        .map((e) => e.config.name),
    )
    expect(names.has('dev-prescription')).toBe(true)
    expect(names.has('dev-prescription_psmv')).toBe(true)
    expect(
      entries.filter((e) => e.config.name === 'dev-prescription' || e.config.name === 'dev-prescription_psmv').length,
    ).toBe(2)
  })
})

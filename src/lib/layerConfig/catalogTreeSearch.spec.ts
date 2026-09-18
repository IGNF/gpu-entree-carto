import { describe, expect, it } from 'vitest'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import {
  catalogNodesMatchingSearch,
  flattenCatalogSwitcherNodes,
} from '@/lib/layerConfig/catalogTreeSearch'

describe('catalogTreeSearch', () => {
  const roots: TreeLayerNode[] = [
    {
      id: 'a',
      title: 'Zonages PLU',
      visible: true,
      children: [{ id: 'b', title: 'Prescriptions surf', visible: true }],
    },
    {
      id: 'c',
      title: 'Autre',
      visible: true,
      gpuOnlyLegend: true,
      gpuMapLayer: true,
      children: [{ id: 'd', title: 'Légende seule', visible: true, gpuMapLayer: true }],
    },
  ]

  it('flattenCatalogSwitcherNodes ignore onlyLegend', () => {
    const flat = flattenCatalogSwitcherNodes(roots)
    expect(flat.map((n) => n.id)).toEqual(['a', 'b', 'd'])
  })

  it('catalogNodesMatchingSearch filtre par titre', () => {
    const hits = catalogNodesMatchingSearch(roots, 'presc')
    expect(hits.map((n) => n.id)).toEqual(['b'])
  })
})

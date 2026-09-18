import { describe, expect, it } from 'vitest'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import {
  computeMapVisibilityById,
  isCatalogAggregate,
} from '@/lib/layerConfig/catalogCheckboxLogic'
import {
  aggregateDetailToggleForStackNode,
  aggregatePanelStateAfterRegroup,
  aggregateRegroupForStackNode,
  mapVisibilityOptionsFromSplitIds,
  pruneSplitAggregateIds,
} from '@/lib/layerConfig/catalogAggregateDetail'
import { collectDataLayersStackNodes } from '@/lib/layerConfig/catalogDataLayersStack'
import { buildCatalogTreeIndex } from '@/lib/layerConfig/catalogTreeIndex'

describe('catalog aggregate detail (split)', () => {
  const roots: TreeLayerNode[] = [
    {
      id: 'presc',
      title: 'Prescriptions',
      visible: true,
      gpuMapLayer: true,
      children: [
        { id: 'presc-a', title: 'Presc A', visible: true, gpuMapLayer: true },
        { id: 'presc-b', title: 'Presc B', visible: true, gpuMapLayer: true },
      ],
    },
  ]

  const index = buildCatalogTreeIndex(roots)
  const checked = { presc: true, 'presc-a': true, 'presc-b': true }

  it('désactive la tuile agrégat et active les enfants directs', () => {
    expect(isCatalogAggregate(index.nodesById.get('presc')!)).toBe(true)
    const opacity = { presc: 70, 'presc-a': 70, 'presc-b': 70 }
    const base = computeMapVisibilityById(checked, index, opacity)
    expect(base.presc).toBe(true)
    expect(base['presc-a']).toBe(false)

    const split = new Set(['presc'])
    const splitVis = computeMapVisibilityById(
      checked,
      index,
      opacity,
      mapVisibilityOptionsFromSplitIds(split),
    )
    expect(splitVis.presc).toBe(false)
    expect(splitVis['presc-a']).toBe(true)
    expect(splitVis['presc-b']).toBe(true)

    const stackIds = collectDataLayersStackNodes(
      roots,
      checked,
      index.parentById,
      splitVis,
    ).map((n) => n.id)
    expect(stackIds).not.toContain('presc')
    expect(stackIds).toContain('presc-a')
    expect(stackIds).toContain('presc-b')
  })

  it('conserve le mode détaillé même si les opacités redeviennent identiques', () => {
    const split = new Set(['presc'])
    expect(pruneSplitAggregateIds(split, checked, index)).toEqual(new Set(['presc']))

    const opacityMixed = { presc: 70, 'presc-a': 50, 'presc-b': 70 }
    expect(pruneSplitAggregateIds(split, checked, index)).toEqual(new Set(['presc']))
    expect(
      computeMapVisibilityById(
        checked,
        index,
        opacityMixed,
        mapVisibilityOptionsFromSplitIds(split),
      ).presc,
    ).toBe(false)
  })

  it('boutons détailler / regrouper', () => {
    const emptySplit = new Set<string>()
    expect(
      aggregateDetailToggleForStackNode(index.nodesById.get('presc')!, emptySplit)
        ?.aggregateId,
    ).toBe('presc')

    const split = new Set(['presc'])
    expect(aggregateDetailToggleForStackNode(index.nodesById.get('presc')!, split)).toBeNull()
    expect(
      aggregateRegroupForStackNode(index.nodesById.get('presc-a')!, split, index)?.aggregateId,
    ).toBe('presc')
    expect(
      aggregateRegroupForStackNode(index.nodesById.get('presc-b')!, split, index)?.aggregateId,
    ).toBe('presc')
  })

  it('agrégat masqué / grisé si tous les enfants le sont', () => {
    const agg = index.nodesById.get('presc')!
    const saved = { visible: true, opacity: 80, grayscale: false }
    expect(
      aggregatePanelStateAfterRegroup(agg, saved, [
        { visible: false, opacity: 50, grayscale: true },
        { visible: false, opacity: 70, grayscale: true },
      ]),
    ).toEqual({ visible: false, opacity: 80, grayscale: true })
    expect(
      aggregatePanelStateAfterRegroup(agg, saved, [
        { visible: true, opacity: 50, grayscale: false },
        { visible: false, opacity: 70, grayscale: true },
      ]),
    ).toEqual({ visible: true, opacity: 80, grayscale: false })
  })
})

import { describe, expect, it } from 'vitest'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import {
  catalogNodeOpacityPercent,
  catalogSwitcherDisplayNodes,
  GPU_FORCE_OPACITY_PERCENT,
} from '@/lib/layerConfig/catalogLayerTargets'

function node(partial: Partial<TreeLayerNode> & Pick<TreeLayerNode, 'id' | 'title'>): TreeLayerNode {
  return {
    visible: false,
    ...partial,
  }
}

describe('catalogNodeOpacityPercent', () => {
  it('forceOpacity → 100 %', () => {
    expect(
      catalogNodeOpacityPercent(
        node({ id: 'x', title: 'X', gpuForceOpacity: true, gpuDefaultOpacity: 40 }),
      ),
    ).toBe(GPU_FORCE_OPACITY_PERCENT)
  })
})

describe('catalogSwitcherDisplayNodes', () => {
  it('masque onlyLegend et remonte les enfants visibles', () => {
    const roots: TreeLayerNode[] = [
      node({
        id: 'parent',
        title: 'Parent',
        children: [
          node({ id: 'legend-only', title: 'Légende seule', gpuOnlyLegend: true }),
          node({
            id: 'group',
            title: 'Groupe',
            children: [node({ id: 'wms', title: 'Couche', gpuMapLayer: true })],
          }),
        ],
      }),
    ]

    const display = catalogSwitcherDisplayNodes(roots)
    expect(display.map((n) => n.id)).toEqual(['parent'])
    expect(display[0].children?.map((n) => n.id)).toEqual(['group'])
    expect(display[0].children?.[0].children?.map((n) => n.id)).toEqual(['wms'])
  })

  it('remonte les enfants d’un onlyLegend sans ligne intermédiaire', () => {
    const roots: TreeLayerNode[] = [
      node({
        id: 'parent',
        title: 'Parent',
        children: [
          node({
            id: 'legend-only',
            title: 'Masqué',
            gpuOnlyLegend: true,
            children: [node({ id: 'child', title: 'Enfant', gpuMapLayer: true })],
          }),
        ],
      }),
    ]

    const display = catalogSwitcherDisplayNodes(roots)
    expect(display[0].children?.map((n) => n.id)).toEqual(['child'])
  })
})

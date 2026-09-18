import { describe, expect, it } from 'vitest'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import {
  catalogAncestorIdsToExpand,
  catalogSubtreeFullyChecked,
  catalogSubtreePartiallyChecked,
} from '@/lib/layerConfig/catalogTreeIndex'

describe('catalogSubtreeFullyChecked', () => {
  const tree: TreeLayerNode = {
    id: 'p',
    title: 'P',
    visible: true,
    children: [
      { id: 'a', title: 'A', visible: true },
      { id: 'b', title: 'B', visible: false },
    ],
  }

  it('false si un descendant est décoché', () => {
    expect(catalogSubtreeFullyChecked(tree, { p: true, a: true, b: false })).toBe(false)
  })

  it('true si tout le sous-arbre est coché', () => {
    expect(catalogSubtreeFullyChecked(tree, { p: true, a: true, b: true })).toBe(true)
  })
})

describe('catalogAncestorIdsToExpand', () => {
  it('déplie les ancêtres d’une sélection partielle', () => {
    const roots: TreeLayerNode[] = [
      {
        id: 'root',
        title: 'Root',
        visible: false,
        children: [
          {
            id: 'group',
            title: 'Group',
            visible: false,
            children: [{ id: 'leaf', title: 'Leaf', visible: true }],
          },
          { id: 'other', title: 'Other', visible: false },
        ],
      },
    ]
    const expand = catalogAncestorIdsToExpand(roots, {
      root: true,
      group: true,
      leaf: true,
      other: false,
    })
    // « group » entièrement coché → replié ; « root » partiel (other décoché) → déplié
    expect([...expand].sort()).toEqual(['root'])
  })

  it('ne déplie pas un parent dont tout le sous-arbre est coché', () => {
    const roots: TreeLayerNode[] = [
      {
        id: 'vue',
        title: 'VUE DETAILLEE',
        visible: true,
        children: [
          {
            id: 'zonages',
            title: 'Zonages',
            visible: true,
            children: [{ id: 'z-leaf', title: 'Z leaf', visible: true }],
          },
          {
            id: 'presc',
            title: 'Prescriptions',
            visible: true,
            children: [
              { id: 'p1', title: 'P1', visible: true },
              { id: 'p2', title: 'P2', visible: true },
            ],
          },
        ],
      },
    ]
    const allChecked = {
      vue: true,
      zonages: true,
      'z-leaf': true,
      presc: true,
      p1: true,
      p2: true,
    }
    expect(catalogAncestorIdsToExpand(roots, allChecked).size).toBe(0)
  })

  it('déplie jusqu’à Prescriptions si un enfant est décoché', () => {
    const roots: TreeLayerNode[] = [
      {
        id: 'vue',
        title: 'VUE DETAILLEE',
        visible: true,
        children: [
          {
            id: 'zonages',
            title: 'Zonages',
            visible: true,
            children: [{ id: 'z-leaf', title: 'Z leaf', visible: true }],
          },
          {
            id: 'presc',
            title: 'Prescriptions',
            visible: true,
            children: [
              { id: 'p1', title: 'P1', visible: true },
              { id: 'p2', title: 'P2', visible: false },
            ],
          },
        ],
      },
    ]
    const expand = catalogAncestorIdsToExpand(roots, {
      vue: true,
      zonages: true,
      'z-leaf': true,
      presc: true,
      p1: true,
      p2: false,
    })
    expect([...expand].sort()).toEqual(['presc', 'vue'])
  })

  it('ne déplie rien si aucune case cochée', () => {
    const roots: TreeLayerNode[] = [{ id: 'root', title: 'Root', visible: false }]
    expect(catalogAncestorIdsToExpand(roots, {}).size).toBe(0)
  })

  it('ne déplie pas une racine SUP entièrement décochée (visible absent)', () => {
    const roots: TreeLayerNode[] = [
      {
        id: 'sup',
        title: "SERVITUDE D'UTILITE PUBLIQUE",
        visible: false,
        children: [
          { id: 'sup-a', title: 'Cat A', visible: false },
          { id: 'sup-b', title: 'Cat B', visible: false },
        ],
      },
    ]
    const checked = { sup: false, 'sup-a': false, 'sup-b': false }
    expect(catalogSubtreePartiallyChecked(roots[0]!, checked)).toBe(false)
    expect(catalogAncestorIdsToExpand(roots, checked).size).toBe(0)
  })
})

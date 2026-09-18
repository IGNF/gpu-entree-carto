import { describe, expect, it } from 'vitest'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import {
  applyUserCatalogToggle,
  computeMapVisibilityById,
  isSameAsDescendants,
} from '@/lib/layerConfig/catalogCheckboxLogic'
import { buildCatalogTreeIndex } from '@/lib/layerConfig/catalogTreeIndex'

function node(partial: TreeLayerNode): TreeLayerNode {
  return partial
}

describe('catalogCheckboxLogic', () => {
  const roots: TreeLayerNode[] = [
    node({
      id: 'du',
      title: 'DU',
      visible: false,
      gpuVirtual: true,
      children: [
        node({
          id: 'zone',
          title: 'Zonages',
          visible: false,
          gpuMapLayer: true,
        }),
        node({
          id: 'presc',
          title: 'Prescriptions',
          visible: false,
          gpuMapLayer: true,
          children: [
            node({
              id: 'presc-leaf',
              title: 'Presc leaf',
              visible: false,
              gpuMapLayer: true,
            }),
          ],
        }),
      ],
    }),
  ]

  const index = buildCatalogTreeIndex(roots)

  it('propage la coche aux descendants', () => {
    const checked: Record<string, boolean> = {}
    applyUserCatalogToggle(checked, 'du', true, index)
    expect(checked.du).toBe(true)
    expect(checked.zone).toBe(true)
    expect(checked.presc).toBe(true)
    expect(checked['presc-leaf']).toBe(true)
  })

  it('affiche les feuilles onlyLegend quand le parent virtual est coché', () => {
    const scotRoots: TreeLayerNode[] = [
      node({
        id: 'scot-v',
        title: 'SCOT',
        visible: false,
        gpuVirtual: true,
        children: [
          node({
            id: 'scot-wms',
            title: 'SCOT WMS',
            visible: false,
            gpuMapLayer: true,
            gpuOnlyLegend: true,
          }),
          node({
            id: 'mec-wms',
            title: 'MEC',
            visible: false,
            gpuMapLayer: true,
            gpuOnlyLegend: true,
          }),
        ],
      }),
    ]
    const scotIndex = buildCatalogTreeIndex(scotRoots)
    const checked: Record<string, boolean> = {}
    applyUserCatalogToggle(checked, 'scot-v', true, scotIndex)
    const opacity = { 'scot-wms': 80, 'mec-wms': 80 }
    const mapVis = computeMapVisibilityById(checked, scotIndex, opacity)
    expect(mapVis['scot-wms']).toBe(true)
    expect(mapVis['mec-wms']).toBe(true)
  })

  it('garde l’agrégat si l’opacité est alignée sur un enfant virtual intermédiaire', () => {
    const roots: TreeLayerNode[] = [
      node({
        id: 'presc',
        title: 'Prescriptions',
        visible: true,
        gpuMapLayer: true,
        children: [
          node({
            id: 'virt',
            title: 'Groupe',
            visible: true,
            gpuVirtual: true,
            children: [
              node({
                id: 'leaf',
                title: 'Leaf',
                visible: true,
                gpuMapLayer: true,
              }),
            ],
          }),
        ],
      }),
    ]
    const nestedIndex = buildCatalogTreeIndex(roots)
    const checked: Record<string, boolean> = {
      presc: true,
      virt: true,
      leaf: true,
    }
    const opacity = { presc: 45, virt: 45, leaf: 45 }
    const mapVis = computeMapVisibilityById(checked, nestedIndex, opacity)
    expect(mapVis.presc).toBe(true)
    expect(mapVis.leaf).toBe(false)
  })

  it('active l’agrégat parent quand tout le sous-arbre est coché', () => {
    const checked: Record<string, boolean> = {
      du: true,
      zone: true,
      presc: true,
      'presc-leaf': true,
    }
    expect(
      isSameAsDescendants(checked, index.nodesById.get('presc')!, index, {
        presc: 70,
        'presc-leaf': 70,
      }),
    ).toBe(true)
    const opacity = { zone: 70, presc: 70, 'presc-leaf': 70 }
    const mapVis = computeMapVisibilityById(checked, index, opacity)
    expect(mapVis.presc).toBe(true)
    expect(mapVis['presc-leaf']).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import { computeMapVisibilityById } from '@/lib/layerConfig/catalogCheckboxLogic'
import {
  aggregateStackNodeLegend,
  collectActiveOnlyLegendNodesForLegendsPanel,
  collectDataLayersStackNodes,
  collectForceOpacityWmsIdsBottomToTop,
  isDataLayersPanelEntry,
  mergeWmsStackOrderWithForceOpacityOnTop,
  shouldShowInDataLayersStack,
  catalogIdsForPanelOpacityWhenEntryAdjusted,
} from '@/lib/layerConfig/catalogDataLayersStack'
import { buildCatalogTreeIndex } from '@/lib/layerConfig/catalogTreeIndex'

describe('collectDataLayersStackNodes', () => {
  const roots: TreeLayerNode[] = [
    {
      id: 'vue-ens',
      title: "VUE D'ENSEMBLE",
      visible: true,
      gpuVirtual: true,
      gpuHideLayers: true,
      hiddenCatalogChildren: [
        { id: 'doc', title: 'DOCUMENT', visible: true, gpuMapLayer: true },
        { id: 'com', title: 'COMMUNE', visible: true, gpuMapLayer: true },
      ],
    },
    {
      id: 'mec',
      title: 'MEC',
      visible: true,
      gpuMapLayer: true,
      gpuForceOpacity: true,
    },
    {
      id: 'du',
      title: 'VUE DETAILLEE',
      visible: true,
      gpuVirtual: true,
      children: [
        { id: 'zone', title: 'Zonages', visible: true, gpuMapLayer: true },
        {
          id: 'presc',
          title: 'Prescriptions',
          visible: true,
          gpuMapLayer: true,
          children: [
            { id: 'presc-leaf', title: 'Presc leaf', visible: true, gpuMapLayer: true },
          ],
        },
      ],
    },
  ]

  const index = buildCatalogTreeIndex(roots)

  it('liste les entrées cochées actives sur la carte (hideLayers → parent seul)', () => {
    const checked = {
      'vue-ens': true,
      doc: true,
      com: true,
      mec: true,
      du: true,
      zone: true,
      presc: true,
      'presc-leaf': true,
    }
    const opacity = { doc: 70, com: 70, zone: 70, presc: 70, 'presc-leaf': 70 }
    const mapVis = computeMapVisibilityById(checked, index, opacity)
    const ids = collectDataLayersStackNodes(
      roots,
      checked,
      index.parentById,
      mapVis,
    ).map((n) => n.id)
    expect(ids).toContain('vue-ens')
    expect(ids).not.toContain('doc')
    expect(ids).not.toContain('com')
    expect(ids).not.toContain('mec')
    expect(mapVis.presc).toBe(true)
    expect(mapVis['presc-leaf']).toBe(false)
    expect(ids).toContain('presc')
    expect(ids).not.toContain('presc-leaf')
    expect(ids).toContain('zone')
  })

  it('mergeWmsStackOrderWithForceOpacityOnTop place MEC au sommet', () => {
    const mapVis = { zone: true, mec: true }
    const merged = mergeWmsStackOrderWithForceOpacityOnTop(['zone'], roots, mapVis)
    expect(merged).toEqual(['zone', 'mec'])
    expect(collectForceOpacityWmsIdsBottomToTop(roots, mapVis)).toEqual(['mec'])
  })

  it('isDataLayersPanelEntry exclut forceOpacity', () => {
    const mec = index.nodesById.get('mec')!
    expect(isDataLayersPanelEntry(mec, { mec: true })).toBe(false)
  })

  it('isDataLayersPanelEntry inclut onlyLegend coché (ex. schéma de cohérence)', () => {
    const onlyLegend: TreeLayerNode = {
      id: 'ol',
      title: 'Légende seule',
      visible: true,
      gpuMapLayer: true,
      gpuOnlyLegend: true,
      legend: [{ id: 'x', title: 'Symbole' }],
    }
    expect(isDataLayersPanelEntry(onlyLegend, { ol: true })).toBe(true)
  })

  it('shouldShowInDataLayersStack affiche onlyLegend actif sur la carte', () => {
    const roots: TreeLayerNode[] = [
      {
        id: 'scot-v',
        title: 'SCOT',
        visible: true,
        gpuVirtual: true,
        children: [
          {
            id: 'sct',
            title: 'SCHEMA DE COHERENCE TERRITORIALE',
            visible: true,
            gpuMapLayer: true,
            gpuOnlyLegend: true,
            legend: [{ id: 'x', title: 'Symbole' }],
          },
        ],
      },
    ]
    const index = buildCatalogTreeIndex(roots)
    const checked = { 'scot-v': true, sct: true }
    const mapVis = { sct: true }
    const sct = index.nodesById.get('sct')!
    expect(
      shouldShowInDataLayersStack(sct, checked, index.parentById, mapVis),
    ).toBe(true)
    const ids = collectDataLayersStackNodes(
      roots,
      checked,
      index.parentById,
      mapVis,
    ).map((n) => n.id)
    expect(ids).toContain('sct')
  })

  it('collectActiveOnlyLegendNodesForLegendsPanel liste les onlyLegend actifs sur la carte', () => {
    const roots: TreeLayerNode[] = [
      {
        id: 'grp',
        title: 'Groupe',
        visible: true,
        gpuVirtual: true,
        children: [
          {
            id: 'ol',
            title: 'Légende seule',
            visible: true,
            gpuMapLayer: true,
            gpuOnlyLegend: true,
            legend: [{ id: 'x', title: 'Symbole' }],
          },
        ],
      },
    ]
    const checked = { grp: true, ol: true }
    const mapVis = { ol: true }
    const list = collectActiveOnlyLegendNodesForLegendsPanel(roots, checked, mapVis)
    expect(list.map((n) => n.id)).toEqual(['ol'])
  })

  it('aggregateStackNodeLegend privilégie la légende du nœud puis les descendants', () => {
    const withOwn: TreeLayerNode = {
      id: 'p',
      title: 'P',
      visible: true,
      gpuHideLayers: true,
      legend: [{ id: 'lp', title: 'Parent' }],
      hiddenCatalogChildren: [
        {
          id: 'c',
          title: 'C',
          visible: true,
          legend: [{ id: 'lc', title: 'Child' }],
        },
      ],
    }
    expect(aggregateStackNodeLegend(withOwn)?.map((l) => l.title)).toEqual(['Parent'])

    const fromChildren: TreeLayerNode = {
      id: 'p2',
      title: 'P2',
      visible: true,
      gpuHideLayers: true,
      hiddenCatalogChildren: [
        {
          id: 'c2',
          title: 'C2',
          visible: true,
          legend: [{ id: 'lc2', title: 'Child' }],
        },
      ],
    }
    expect(aggregateStackNodeLegend(fromChildren)?.map((l) => l.title)).toEqual(['Child'])
  })

  it('aggregateStackNodeLegend remonte les légendes des feuilles d’un agrégat WMS', () => {
    const presc: TreeLayerNode = {
      id: 'presc',
      title: 'Prescriptions',
      visible: true,
      gpuMapLayer: true,
      children: [
        {
          id: 'leaf',
          title: 'Leaf',
          visible: true,
          gpuMapLayer: true,
          legend: [{ id: 'leg', title: 'Symbole' }],
        },
      ],
    }
    expect(aggregateStackNodeLegend(presc)?.map((l) => l.title)).toEqual(['Symbole'])
  })
})

describe('catalogIdsForPanelOpacityWhenEntryAdjusted', () => {
  it('inclut les nœuds virtual du sous-arbre d’un agrégat actif', () => {
    const roots: TreeLayerNode[] = [
      {
        id: 'presc',
        title: 'Prescriptions',
        visible: true,
        gpuMapLayer: true,
        children: [
          {
            id: 'virt',
            title: 'Groupe',
            visible: true,
            gpuVirtual: true,
            children: [
              { id: 'presc-leaf', title: 'Leaf', visible: true, gpuMapLayer: true },
            ],
          },
        ],
      },
    ]
    const index = buildCatalogTreeIndex(roots)
    const presc = index.nodesById.get('presc')!
    const mapVis = { presc: true, 'presc-leaf': false }
    expect(catalogIdsForPanelOpacityWhenEntryAdjusted(presc, mapVis).sort()).toEqual([
      'presc',
      'presc-leaf',
      'virt',
    ])
  })
})

describe('shouldShowInDataLayersStack', () => {
  it('masque une feuille cochée si l’agrégat parent est actif sur la carte', () => {
    const roots: TreeLayerNode[] = [
      {
        id: 'presc',
        title: 'Prescriptions',
        visible: true,
        gpuMapLayer: true,
        children: [
          { id: 'presc-leaf', title: 'Leaf', visible: true, gpuMapLayer: true },
        ],
      },
    ]
    const index = buildCatalogTreeIndex(roots)
    const checked = { presc: true, 'presc-leaf': true }
    const mapVis = { presc: true, 'presc-leaf': false }
    const leaf = index.nodesById.get('presc-leaf')!
    expect(
      shouldShowInDataLayersStack(leaf, checked, index.parentById, mapVis),
    ).toBe(false)
  })
})

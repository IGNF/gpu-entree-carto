import { describe, expect, it } from 'vitest'
import type { TreeLayerNode } from '@/types/treeLayerNode'
import {
  applyDocumentCatalogVisibility,
  catalogBranchForRootNode,
  documentCatalogBranchesForDocument,
} from '@/lib/layerConfig/documentCatalogVisibility'

function root(title: string, id: string, children?: TreeLayerNode[]): TreeLayerNode {
  return {
    id,
    title,
    visible: true,
    children,
  }
}

describe('documentCatalogBranchesForDocument', () => {
  it('PLU → vue ensemble + détail', () => {
    const b = documentCatalogBranchesForDocument({ type: 'PLU', name: 'DU_x' })
    expect(b).toEqual(new Set(['du-overview', 'du-detail']))
  })

  it('SUP → sup seulement', () => {
    expect(documentCatalogBranchesForDocument({ type: 'SUP', name: 'x' })).toEqual(new Set(['sup']))
  })

  it('SCoT → scot seulement', () => {
    expect(documentCatalogBranchesForDocument({ type: 'SCoT', name: 'scot_1' })).toEqual(
      new Set(['scot']),
    )
  })

  it('MEC scot vs MEC du', () => {
    expect(
      documentCatalogBranchesForDocument({ type: 'MEC', name: 'MEC_2_scot_200051183' }),
    ).toEqual(new Set(['scot']))
    expect(documentCatalogBranchesForDocument({ type: 'MEC', name: 'MEC_2_DU_31526' })).toEqual(
      new Set(['du-overview', 'du-detail']),
    )
  })
})

describe('applyDocumentCatalogVisibility', () => {
  const tree: TreeLayerNode[] = [
    root("VUE D'ENSEMBLE DES DOCUMENTS D'URBANISME", 'lowscale', [
      { id: 'ls-child', title: 'Commune', visible: true, gpuMapLayer: true },
    ]),
    root("VUE DETAILLEE DES DOCUMENTS D'URBANISME", 'du-psmv', [
      { id: 'zonage', title: 'Zonage', visible: true, gpuMapLayer: true },
    ]),
    root("SERVITUDE D'UTILITE PUBLIQUE", 'sup', [
      { id: 'sup-a', title: 'Cat', visible: true, gpuMapLayer: true },
    ]),
    root('SCHEMA DE COHERENCE TERRITORIALE', 'scot-root', [
      { id: 'scot-a', title: 'SCOT', visible: true, gpuMapLayer: true },
    ]),
  ]

  it('SCoT : seul le schéma reste coché', () => {
    applyDocumentCatalogVisibility(tree, { type: 'SCoT', name: 'scot_200051183' })
    expect(tree[0].visible).toBe(false)
    expect(tree[0].children?.[0].visible).toBe(false)
    expect(tree[1].visible).toBe(false)
    expect(tree[2].visible).toBe(false)
    expect(tree[3].visible).toBe(true)
    expect(tree[3].children?.[0].visible).toBe(true)
  })

  it('PLU : ensemble + détail', () => {
    applyDocumentCatalogVisibility(tree, { type: 'PLU', name: 'DU_62193' })
    expect(tree[0].visible).toBe(true)
    expect(tree[1].visible).toBe(true)
    expect(tree[2].visible).toBe(false)
    expect(tree[3].visible).toBe(false)
  })
})

describe('catalogBranchForRootNode', () => {
  it('reconnaît les titres catalogue gpu', () => {
    expect(
      catalogBranchForRootNode({
        id: 'x',
        title: "VUE DETAILLEE DES DOCUMENTS D'URBANISME",
        visible: false,
      }),
    ).toBe('du-detail')
  })
})

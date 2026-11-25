import { describe, expect, it } from 'vitest'
import type { TreeLayerNode } from '@/types/treeLayerNode'
import {
  applyDocumentCatalogVisibility,
  catalogBranchForRootNode,
  catalogCheckedForStartupDocument,
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

describe('catalogCheckedForStartupDocument', () => {
  const tree = (): TreeLayerNode[] => [
    {
      id: 'lowscale',
      title: "VUE D'ENSEMBLE DES DOCUMENTS D'URBANISME",
      visible: true,
      children: [{ id: 'ls-child', title: 'Commune', visible: true, gpuMapLayer: true }],
    },
    {
      id: 'sup',
      title: "SERVITUDE D'UTILITE PUBLIQUE",
      visible: false,
      children: [{ id: 'sup-a', title: 'Cat', visible: false, gpuMapLayer: true }],
    },
  ]

  it('document SUP : cases attendues au rechargement sans couche dans le permalink', () => {
    expect(
      catalogCheckedForStartupDocument(tree(), { id: 'x', type: 'SUP', name: 'SUP_AC4' }),
    ).toEqual({ lowscale: false, 'ls-child': false, sup: true, 'sup-a': true })
  })

  it('sans document : null ; l’arbre d’origine n’est pas modifié', () => {
    const roots = tree()
    expect(catalogCheckedForStartupDocument(roots, null)).toBeNull()
    catalogCheckedForStartupDocument(roots, { id: 'x', type: 'SUP', name: 'SUP_AC4' })
    expect(roots[1].visible).toBe(false)
    expect(roots[0].visible).toBe(true)
  })
})

describe('documentCatalogBranchesForDocument — types de document gpu-site (DocumentType)', () => {
  const branches = (type: string, name = '') =>
    [...(documentCatalogBranchesForDocument({ id: 'x', type, name }) ?? [])].sort()
  it.each(['PLU', 'POS', 'CC', 'PLUi', 'PSMV'])('%s → vue d’ensemble + vue détaillée', (type) => {
    expect(branches(type)).toEqual(['du-detail', 'du-overview'])
  })
  it('SUP → servitudes', () => expect(branches('SUP')).toEqual(['sup']))
  it('SCoT → SCoT', () => expect(branches('SCoT')).toEqual(['scot']))
  it('MEC DU → vues DU ; MEC SCoT → SCoT', () => {
    expect(branches('MEC', 'MEC_2_DU_31526')).toEqual(['du-detail', 'du-overview'])
    expect(branches('MEC', 'MEC_1_scot_200051183')).toEqual(['scot'])
  })
})

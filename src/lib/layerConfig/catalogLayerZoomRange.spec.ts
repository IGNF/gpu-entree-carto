import { describe, expect, it } from 'vitest'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import { isCatalogNodeInZoomRange, isZoomInLayerRange } from '@/lib/layerConfig/catalogLayerZoomRange'

describe('isZoomInLayerRange', () => {
  it('inclut les bornes min et max', () => {
    expect(isZoomInLayerRange(10, 10, 15)).toBe(true)
    expect(isZoomInLayerRange(15, 10, 15)).toBe(true)
    expect(isZoomInLayerRange(9, 10, 15)).toBe(false)
  })
})

describe('isCatalogNodeInZoomRange', () => {
  it('teste la tuile WMS feuille', () => {
    const leaf: TreeLayerNode = {
      id: 'a',
      title: 'A',
      visible: true,
      gpuMapLayer: true,
      gpuMinZoomLevel: 12,
      gpuMaxZoomLevel: 18,
    }
    expect(isCatalogNodeInZoomRange(leaf, 10)).toBe(false)
    expect(isCatalogNodeInZoomRange(leaf, 14)).toBe(true)
  })

  it('dégrise un dossier si un enfant est dans la plage', () => {
    const folder: TreeLayerNode = {
      id: 'g',
      title: 'Groupe',
      visible: true,
      gpuVirtual: true,
      children: [
        {
          id: 'a',
          title: 'A',
          visible: true,
          gpuMapLayer: true,
          gpuMinZoomLevel: 12,
          gpuMaxZoomLevel: 18,
        },
      ],
    }
    expect(isCatalogNodeInZoomRange(folder, 10)).toBe(false)
    expect(isCatalogNodeInZoomRange(folder, 14)).toBe(true)
  })

  it('agrégat WMS : plage du parent uniquement', () => {
    const aggregate: TreeLayerNode = {
      id: 'p',
      title: 'Parent',
      visible: true,
      gpuMapLayer: true,
      gpuMinZoomLevel: 8,
      gpuMaxZoomLevel: 12,
      children: [
        {
          id: 'c',
          title: 'Enfant',
          visible: true,
          gpuMapLayer: true,
          gpuMinZoomLevel: 14,
          gpuMaxZoomLevel: 18,
        },
      ],
    }
    expect(isCatalogNodeInZoomRange(aggregate, 10)).toBe(true)
    expect(isCatalogNodeInZoomRange(aggregate, 16)).toBe(false)
  })
})

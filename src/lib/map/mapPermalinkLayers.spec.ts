import { describe, expect, it } from 'vitest'
import {
  buildCatalogIdByPermalinkId,
  decodeLayerPermalinkValue,
  encodeLayerPermalinkValue,
} from '@/lib/map/mapPermalinkLayers'
import type { GpuLayerCatalogEntry } from '@/lib/layerConfig/gpuLayerConfig'

describe('mapPermalinkLayers', () => {
  it('decode v:w:x:y:z gpu-client', () => {
    expect(decodeLayerPermalinkValue('1:0.8:8:0:1')).toEqual({
      checked: true,
      opacity: 0.8,
      stackIndex: 8,
      grayscale: false,
      visible: true,
    })
    expect(decodeLayerPermalinkValue('1:0.7:2:1:0')).toEqual({
      checked: true,
      opacity: 0.7,
      stackIndex: 2,
      grayscale: true,
      visible: false,
    })
  })

  it('legacy 4 segments v:w:x:y (y = gris, z implicite si coché)', () => {
    expect(decodeLayerPermalinkValue('0:0.7:0:0')).toEqual({
      checked: false,
      opacity: 0.7,
      stackIndex: 0,
      grayscale: false,
      visible: false,
    })
    expect(decodeLayerPermalinkValue('1:0.7:2:0')).toEqual({
      checked: true,
      opacity: 0.7,
      stackIndex: 2,
      grayscale: false,
      visible: true,
    })
  })

  it('encode v:w:x:y:z', () => {
    expect(
      encodeLayerPermalinkValue({
        checked: true,
        opacity: 0.8,
        stackIndex: 8,
        grayscale: false,
        visible: true,
      }),
    ).toBe('1:0.8:8:0:1')
    expect(
      encodeLayerPermalinkValue({
        checked: false,
        opacity: 0.7,
        stackIndex: 0,
        grayscale: true,
        visible: false,
      }),
    ).toBe('0:0.7:0:1:0')
  })

  it('résout scot sur le groupe virtual, pas onlyLegend', () => {
    const entries: GpuLayerCatalogEntry[] = [
      {
        id: 'scot',
        path: '/scot',
        config: { name: 'scot', virtual: true },
      },
      {
        id: 'scot--scot',
        path: '/scot/scot',
        config: { name: 'scot', onlyLegend: true },
      },
    ]
    const map = buildCatalogIdByPermalinkId(entries)
    expect(map.get('scot')).toBe('scot')
  })
})

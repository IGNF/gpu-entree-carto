import { describe, expect, it } from 'vitest'
import type { GpuLayerConfig } from '@/lib/layerConfig/gpuLayerConfig'
import {
  buildLegendItemsForGpuLayer,
  legendImageUrl,
  normalizeLegendImageBaseUrl,
  type GpuLegendBuildOptions,
  type LegendConfigEntry,
} from '@/lib/layerConfig/gpuLegendItems'

describe('normalizeLegendImageBaseUrl', () => {
  it('retire la query et force le slash final', () => {
    expect(normalizeLegendImageBaseUrl('http://127.0.0.1:8000/build/gpu/images/map_legend/?v6')).toBe(
      'http://127.0.0.1:8000/build/gpu/images/map_legend/',
    )
  })
})

describe('legendImageUrl scaleDependant', () => {
  it('bascule -lowscale / -highscale selon le zoom', () => {
    const base = 'http://x/'
    expect(legendImageUrl(base, 'zone_secteur/surf/01', true, 16, 10)).toContain('-lowscale.png')
    expect(legendImageUrl(base, 'zone_secteur/surf/01', true, 16, 18)).toContain('-highscale.png')
  })
})

describe('buildLegendItemsForGpuLayer filter + LEGEND_CONFIG', () => {
  const legendConfig: LegendConfigEntry[] = [
    {
      name: 'info_surf',
      allowedValues: ['05', '07'],
    },
    {
      name: 'info_lin',
      allowedValues: ['05'],
      hasfilter2: { '05': ['A', 'B'] },
    },
  ]

  const opts: GpuLegendBuildOptions = {
    legendConfig,
    legendReferences: {
      info: {
        '05': { title: 'Type 05' },
        '05-A': { title: 'Type 05 sous-filtre A' },
      },
    },
    imagePath: 'http://127.0.0.1:8000/legend/',
    zoomAtInit: 6,
    ancestorLayers: [],
  }

  it('construit info_surf/07 sans sous-règle', () => {
    const layer: GpuLayerConfig = {
      name: 'dev-info,dev-info_psmv',
      title: 'Infos',
      filterAttribute: 'typeinf',
      filterValue: ['07'],
    }
    const optsSurf: GpuLegendBuildOptions = {
      ...opts,
      legendReferences: {
        info: { '07': { title: 'Type 07' } },
      },
    }
    const items = buildLegendItemsForGpuLayer(layer, optsSurf)
    expect(items.some((i) => i.legendImageName === 'info_surf/07')).toBe(true)
  })

  it('ajoute le suffixe hasfilter2 à l’image', () => {
    const layer: GpuLayerConfig = {
      name: 'dev-info',
      filterAttribute: 'typeinf',
      filterValue: ['05'],
    }
    const items = buildLegendItemsForGpuLayer(layer, opts)
    expect(items.some((i) => i.legendImageName === 'info_lin/05-A')).toBe(true)
  })
})

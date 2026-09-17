import { describe, expect, it } from 'vitest'
import type { GpuLayerConfig } from '@/lib/layerConfig/gpuLayerConfig'
import {
  buildLegendItemsForGpuLayer,
  dedupeLegendItems,
  dedupeLegendLayersForPanel,
  legendImageUrl,
  legendItemVisualKey,
  normalizeLegendImageBaseUrl,
  type GpuLegendBuildOptions,
  type LegendConfigEntry,
} from '@/lib/layerConfig/gpuLegendItems'

describe('dedupeLegendItems', () => {
  it('supprime les entrées au même titre et mêmes images', () => {
    const a = {
      id: '1',
      title: 'Mise en compatibilité',
      legendImageName: 'zone_surf/01',
      legendImagePath: 'http://x/',
    }
    const b = { ...a, id: '2' }
    expect(dedupeLegendItems([a, b])).toHaveLength(1)
    expect(legendItemVisualKey(a)).toBe(legendItemVisualKey(b))
  })

  it('masque un second accordéon identique (titre + légende)', () => {
    const legend = [{ id: '1', title: 'Symbole', legendImageName: 'a/b' }]
    const layers = dedupeLegendLayersForPanel([
      { id: 'l1', title: 'MISE EN COMPATIBILITE', legend },
      { id: 'l2', title: 'MISE EN COMPATIBILITE', legend: [...legend] },
    ])
    expect(layers).toHaveLength(1)
    expect(layers[0]!.id).toBe('l1')
  })
})

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

  it('agrège les légendes hideLayers sans filtre (sauf prescription_psmv)', () => {
    const parent: GpuLayerConfig = {
      name: 'dev-prescription,dev-prescription_psmv',
      title: 'Groupe',
      hideLayers: true,
      layers: [
        {
          name: 'dev-prescription',
          filterAttribute: 'typepsc',
          filterValue: ['03'],
        },
        {
          name: 'dev-prescription_psmv',
          filterAttribute: 'typepsc',
          filterValue: ['03'],
        },
      ],
    }
    const optsPresc: GpuLegendBuildOptions = {
      ...opts,
      legendReferences: {
        prescription: { '03': { title: 'Type 03' } },
      },
      legendConfig: [
        { name: 'prescription_surf', allowedValues: ['03'] },
      ],
    }
    const items = buildLegendItemsForGpuLayer(parent, optsPresc)
    expect(items.length).toBeGreaterThan(0)
    expect(items.some((i) => i.title === 'Type 03')).toBe(true)
  })

  it('regroupe pct, lin et surf sur une seule ligne', () => {
    const layer: GpuLayerConfig = {
      name: 'dev-prescription',
      filterAttribute: 'typepsc',
      filterValue: ['01'],
    }
    const optsMulti: GpuLegendBuildOptions = {
      ...opts,
      legendReferences: {
        prescription: { '01': { title: 'Diversité commerciale à protéger ou à développer' } },
      },
      legendConfig: [
        { name: 'prescription_pct', allowedValues: ['01'] },
        { name: 'prescription_lin', allowedValues: ['01'] },
        { name: 'prescription_surf', allowedValues: ['01'] },
      ],
    }
    const items = buildLegendItemsForGpuLayer(layer, optsMulti)
    expect(items).toHaveLength(1)
    expect(items[0]!.title).toBe('Diversité commerciale à protéger ou à développer')
    expect(items[0]!.legendImageNames).toEqual([
      'prescription_pct/01',
      'prescription_lin/01',
      'prescription_surf/01',
    ])
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

/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import OlMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import type TileWMS from 'ol/source/TileWMS'
import { get as getProjection } from 'ol/proj'
import {
  computeWmsGroups,
  GpuWmsLayerRegistry,
  GPU_WMS_CATALOG_IDS_PROP,
  type GpuWmsGroupCandidate,
} from '@/lib/layerConfig/gpuWmsLayers'
import { layerConfigToCatalogEntries, type GpuLayerConfig } from '@/lib/layerConfig/gpuLayerConfig'
import { cloneLayerForPrint } from '@/lib/map/print/cloneMapLayers'
import { buildVisibleLayerFingerprint } from '@/lib/map/print/printMapRenderCache'
import type { StandardViewerDocument } from '@/lib/types'
import config from '@/lib/config'
import { stubResizeObserver } from '@/test/olJsdom'

beforeAll(() => stubResizeObserver())
afterEach(() => {
  delete config.wmsValidationUrl
})

interface Setup {
  registry: GpuWmsLayerRegistry
  map: OlMap
  /** Id catalogue par `name` (ou `title` si plusieurs entrées partagent le nom). */
  ids: Record<string, string>
}

function setup(
  config: GpuLayerConfig[],
  options: { zoom?: number; document?: StandardViewerDocument | null } = {},
): Setup {
  const registry = new GpuWmsLayerRegistry()
  registry.loadFromLayerConfig(config, options.document ?? null)
  const map = new OlMap({ view: new View({ center: [0, 0], zoom: options.zoom ?? 15 }) })
  registry.attachMap(map)
  const ids: Record<string, string> = {}
  for (const entry of layerConfigToCatalogEntries(config)) {
    ids[entry.config.title ?? entry.config.name ?? entry.id] = entry.id
  }
  return { registry, map, ids }
}

function show(s: Setup, ...titles: string[]): void {
  for (const title of titles) s.registry.setVisible(s.ids[title], true)
  s.registry.applyStackOrder(titles.map((t) => s.ids[t]))
  s.registry.flush()
}

function gpuLayers(map: OlMap): TileLayer[] {
  return map
    .getLayers()
    .getArray()
    .filter((l): l is TileLayer => l instanceof TileLayer)
}

function params(layer: TileLayer): Record<string, unknown> {
  return (layer.getSource() as TileWMS).getParams() as Record<string, unknown>
}

/** URL GetMap d'une tuile rendue sur un écran de densité 2. */
function tileUrlAtPixelRatio2(layer: TileLayer): URL {
  const source = layer.getSource() as TileWMS
  const url = source.getTileUrlFunction()([12, 2048, 2048], 2, getProjection('EPSG:3857')!)
  return new URL(url!)
}

const zonage: GpuLayerConfig = { name: 'zone_urba', title: 'Zonage' }
const prescription: GpuLayerConfig = { name: 'prescription_surf', title: 'Prescriptions' }
const info: GpuLayerConfig = {
  name: 'info,info_psmv',
  title: 'Informations',
  filterAttribute: 'typeinf',
  filterValue: ['98'],
}
const mec: GpuLayerConfig = {
  name: 'mec',
  title: 'MEC',
  forceOpacity: true,
  zIndex: '10',
  filterAttribute: 'partition',
  filterValueLike: 'MEC_%_DU_%',
}

describe('couches WMS GPU et densité d’écran', () => {
  function visibleZoneUrbaLayer(): TileLayer {
    const s = setup([zonage], { zoom: 12 })
    show(s, 'Zonage')
    return gpuLayers(s.map)[0]
  }

  it('carte : tuiles demandées en 512 px, sans DPI agrandi (hidpi désactivé)', () => {
    const url = tileUrlAtPixelRatio2(visibleZoneUrbaLayer())
    expect(url.searchParams.get('WIDTH')).toBe('512')
    expect(url.searchParams.has('FORMAT_OPTIONS')).toBe(false)
  })

  it('impression : copie de la couche redessinée à la densité de l’export (hidpi)', () => {
    const printLayer = cloneLayerForPrint(visibleZoneUrbaLayer()) as TileLayer
    const url = tileUrlAtPixelRatio2(printLayer)
    expect(url.searchParams.get('WIDTH')).toBe('1024')
    expect(url.searchParams.get('LAYERS')).toBe('zone_urba')
  })
})

describe('regroupement des couches WMS GPU', () => {
  it('couches contiguës de même opacité : une seule requête, ordre de la pile', () => {
    const s = setup([zonage, prescription])
    show(s, 'Prescriptions', 'Zonage')
    const layers = gpuLayers(s.map)
    expect(layers).toHaveLength(1)
    expect(params(layers[0]).LAYERS).toBe('prescription_surf,zone_urba')
    expect(params(layers[0]).cql_filter).toBeUndefined()
    expect(layers[0].get(GPU_WMS_CATALOG_IDS_PROP)).toEqual([s.ids.Prescriptions, s.ids.Zonage])
  })

  it('filtre CQL par sous-couche, INCLUDE sans filtre, répété pour un nom à virgule', () => {
    const s = setup([zonage, info])
    show(s, 'Zonage', 'Informations')
    const layers = gpuLayers(s.map)
    expect(layers).toHaveLength(1)
    expect(params(layers[0]).LAYERS).toBe('zone_urba,info,info_psmv')
    expect(params(layers[0]).cql_filter).toBe("INCLUDE;typeinf IN ('98');typeinf IN ('98')")
  })

  it('opacité ou noir et blanc différents : groupes séparés, non contigus non fusionnés', () => {
    const s = setup([zonage, prescription, info])
    show(s, 'Zonage', 'Prescriptions', 'Informations')
    s.registry.setOpacity(s.ids.Prescriptions, 40)
    s.registry.flush()
    let layers = gpuLayers(s.map)
    expect(layers.map((l) => params(l).LAYERS)).toEqual([
      'zone_urba',
      'prescription_surf',
      'info,info_psmv',
    ])
    expect(layers[1].getOpacity()).toBeCloseTo(0.4)
    expect(layers.map((l) => l.getZIndex())).toEqual([200, 201, 202])

    s.registry.setOpacity(s.ids.Prescriptions, 70)
    s.registry.setGrayscale(s.ids.Informations, true)
    s.registry.flush()
    layers = gpuLayers(s.map)
    expect(layers.map((l) => params(l).LAYERS)).toEqual([
      'zone_urba,prescription_surf',
      'info,info_psmv',
    ])
    expect(layers[1].get('grayscale')).toBe(true)
  })

  it('forceOpacity : couche opaque à part, au sommet', () => {
    const s = setup([zonage, mec, prescription])
    show(s, 'MEC', 'Zonage', 'Prescriptions')
    const layers = gpuLayers(s.map)
    expect(layers.map((l) => params(l).LAYERS)).toEqual(['zone_urba,prescription_surf', 'mec'])
    expect(layers[1].getOpacity()).toBe(1)
    expect(layers[1].getZIndex()!).toBeGreaterThan(layers[0].getZIndex()!)
  })

  it('plage de zoom : groupes recalculés au passage du seuil', () => {
    const config: GpuLayerConfig[] = [
      { name: 'municipality', title: 'Commune', minZoomLevel: 3, maxZoomLevel: 21 },
      { name: 'document', title: 'Document', minZoomLevel: 3, maxZoomLevel: 11 },
      { name: 'zone_urba', title: 'Zonage', minZoomLevel: 12, maxZoomLevel: 21 },
    ]
    const s = setup(config, { zoom: 10 })
    show(s, 'Commune', 'Document', 'Zonage')
    let layers = gpuLayers(s.map)
    expect(layers.map((l) => params(l).LAYERS)).toEqual(['municipality,document'])
    const view = s.map.getView()
    expect(layers[0].getMaxResolution()).toBeGreaterThan(view.getResolution()!)
    expect(layers[0].getMinResolution()).toBeLessThanOrEqual(view.getResolution()!)

    view.setZoom(13)
    layers = gpuLayers(s.map)
    expect(layers.map((l) => params(l).LAYERS)).toEqual(['municipality,zone_urba'])
    expect(layers[0].getMaxResolution()).toBeGreaterThan(view.getResolution()!)
  })

  it('prévisualisation : suffixe _previsu, commune servie à part (URL différente)', () => {
    config.wmsValidationUrl = 'https://validation.example/wms'
    const s = setup([{ name: 'municipality', title: 'Commune' }, zonage], {
      document: { status: 'document.preview', name: 'DU_12345' },
    })
    show(s, 'Commune', 'Zonage')
    const layers = gpuLayers(s.map)
    expect(layers.map((l) => params(l).LAYERS)).toEqual(['municipality', 'zone_urba_previsu'])
    expect(params(layers[1]).cql_filter).toBe("(partition like 'DU_12345')")
    expect((layers[1].getSource() as TileWMS).getUrls()).toEqual(['https://validation.example/wms'])
  })

  it('prévisualisation sans URL de validation : commune et couches _previsu regroupées', () => {
    const s = setup([{ name: 'municipality', title: 'Commune' }, zonage], {
      document: { status: 'document.preview', name: 'DU_12345' },
    })
    show(s, 'Commune', 'Zonage')
    const layers = gpuLayers(s.map)
    expect(layers.map((l) => params(l).LAYERS)).toEqual(['municipality,zone_urba_previsu'])
    expect(params(layers[0]).cql_filter).toBe("INCLUDE;(partition like 'DU_12345')")
  })

  it('cocher une couche du groupe garde la même couche OpenLayers (pas de clignotement)', () => {
    const s = setup([zonage, prescription, info])
    show(s, 'Zonage', 'Prescriptions')
    const before = gpuLayers(s.map)[0]
    show(s, 'Zonage', 'Prescriptions', 'Informations')
    const after = gpuLayers(s.map)
    expect(after).toHaveLength(1)
    expect(after[0]).toBe(before)
    expect(params(after[0]).LAYERS).toBe('zone_urba,prescription_surf,info,info_psmv')

    s.registry.setVisible(s.ids.Informations, false)
    s.registry.flush()
    expect(params(gpuLayers(s.map)[0]).cql_filter).toBeUndefined()
  })

  it('repli : erreur de tuile sur un groupe → couches seules', () => {
    const s = setup([zonage, prescription])
    show(s, 'Zonage', 'Prescriptions')
    const group = gpuLayers(s.map)[0]
    group.getSource()!.dispatchEvent('tileloaderror')
    s.registry.flush()
    expect(gpuLayers(s.map).map((l) => params(l).LAYERS)).toEqual([
      'zone_urba',
      'prescription_surf',
    ])
  })

  it('impression : clone du groupe en hidpi, empreinte du cache modifiée par la composition', () => {
    const s = setup([zonage, prescription])
    show(s, 'Zonage')
    const fingerprintBefore = buildVisibleLayerFingerprint(s.map)
    show(s, 'Zonage', 'Prescriptions')
    expect(buildVisibleLayerFingerprint(s.map)).not.toBe(fingerprintBefore)

    const printLayer = cloneLayerForPrint(gpuLayers(s.map)[0]) as TileLayer
    const url = tileUrlAtPixelRatio2(printLayer)
    expect(url.searchParams.get('WIDTH')).toBe('1024')
    expect(url.searchParams.get('LAYERS')).toBe('zone_urba,prescription_surf')
  })

  it('visibilité réglée avant attachMap : appliquée à l’attachement', () => {
    const registry = new GpuWmsLayerRegistry()
    registry.loadFromLayerConfig([zonage], null)
    registry.setVisible(layerConfigToCatalogEntries([zonage])[0].id, true)
    const map = new OlMap({ view: new View({ center: [0, 0], zoom: 15 }) })
    registry.attachMap(map)
    expect(gpuLayers(map)).toHaveLength(1)
  })
})

describe('computeWmsGroups', () => {
  const base: Omit<GpuWmsGroupCandidate, 'id' | 'subLayers'> = {
    url: 'https://wms',
    cql: '',
    opacity: 0.7,
    grayscale: false,
    tier: 'stack',
    minResolution: 0,
    maxResolution: Infinity,
  }

  it('étages et URL différents : jamais regroupés', () => {
    const groups = computeWmsGroups([
      { ...base, id: 'a', subLayers: ['a'], tier: 'config:1' },
      { ...base, id: 'b', subLayers: ['b'] },
      { ...base, id: 'c', subLayers: ['c'], url: 'https://autre' },
      { ...base, id: 'd', subLayers: ['d'], url: 'https://autre' },
    ])
    expect(groups.map((g) => g.ids)).toEqual([['a'], ['b'], ['c', 'd']])
  })
})

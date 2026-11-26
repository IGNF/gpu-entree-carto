/**
 * @vitest-environment jsdom
 */
import { beforeAll, describe, expect, it } from 'vitest'
import OlMap from 'ol/Map'
import View from 'ol/View'
import type TileLayer from 'ol/layer/Tile'
import type TileWMS from 'ol/source/TileWMS'
import { get as getProjection } from 'ol/proj'
import { GpuWmsLayerRegistry } from '@/lib/layerConfig/gpuWmsLayers'
import { layerConfigToCatalogEntries } from '@/lib/layerConfig/gpuLayerConfig'
import { cloneLayerForPrint } from '@/lib/map/print/cloneMapLayers'
import { stubResizeObserver } from '@/test/olJsdom'

beforeAll(() => stubResizeObserver())

function visibleZoneUrbaLayer(): TileLayer {
  const config = [{ name: 'zone_urba', title: 'Zonage' }]
  const registry = new GpuWmsLayerRegistry()
  registry.loadFromLayerConfig(config, null)
  const map = new OlMap({ view: new View({ center: [0, 0], zoom: 12 }) })
  registry.attachMap(map)
  registry.setVisible(layerConfigToCatalogEntries(config)[0].id, true)
  return map.getLayers().item(0) as TileLayer
}

/** URL GetMap d'une tuile rendue sur un écran de densité 2. */
function tileUrlAtPixelRatio2(layer: TileLayer): URL {
  const source = layer.getSource() as TileWMS
  const url = source.getTileUrlFunction()([12, 2048, 2048], 2, getProjection('EPSG:3857')!)
  return new URL(url!)
}

describe('couches WMS GPU et densité d’écran', () => {
  it('carte : tuiles rendues à la densité de l’écran (hidpi), sinon agrandies et floues', () => {
    const url = tileUrlAtPixelRatio2(visibleZoneUrbaLayer())
    expect(url.searchParams.get('WIDTH')).toBe('1024')
    expect(url.searchParams.get('FORMAT_OPTIONS')).toBe('dpi:180')
  })

  it('impression : copie de la couche rendue à la densité de l’export', () => {
    const printLayer = cloneLayerForPrint(visibleZoneUrbaLayer()) as TileLayer
    const url = tileUrlAtPixelRatio2(printLayer)
    expect(url.searchParams.get('WIDTH')).toBe('1024')
    expect(url.searchParams.get('LAYERS')).toBe('zone_urba')
  })
})

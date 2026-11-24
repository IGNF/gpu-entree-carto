/**
 * @vitest-environment jsdom
 */
import { beforeAll, describe, expect, it } from 'vitest'
import Feature from 'ol/Feature'
import OlMap from 'ol/Map'
import View from 'ol/View'
import Point from 'ol/geom/Point'
import Polygon from 'ol/geom/Polygon'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { getCenter } from 'ol/extent'
import { PRINT_SEARCH_LAYER_PROP } from '@/lib/map/print/cloneMapLayers'
import { recenterPrintPreviewOnPlace } from '@/lib/map/print/printRecenterTarget'
import { MODE_EMPRISE_PROP } from '@/lib/map/searchResultGraphics'
import { stubResizeObserver } from '@/test/olJsdom'

beforeAll(() => stubResizeObserver())

function previewWith(features: Feature[]): OlMap {
  const map = new OlMap({ view: new View({ center: [0, 0], zoom: 10 }) })
  map.setSize([400, 600])
  const layer = new VectorLayer({ source: new VectorSource({ features }) })
  layer.set(PRINT_SEARCH_LAYER_PROP, true)
  map.addLayer(
    new VectorLayer({
      source: new VectorSource({ features: [new Feature(new Point([9e5, 9e5]))] }),
    }),
  )
  map.addLayer(layer)
  return map
}

const square = (x: number, y: number, s: number) =>
  new Polygon([
    [
      [x, y],
      [x + s, y],
      [x + s, y + s],
      [x, y + s],
      [x, y],
    ],
  ])

describe('Recentrer sur le lieu (aperçu impression)', () => {
  it('emprise rouge pointillé présente : la vue englobe l’emprise', () => {
    const emprise = new Feature(square(5000, 5000, 200))
    emprise.set(MODE_EMPRISE_PROP, 'parcel')
    const map = previewWith([new Feature(new Point([5100, 5100])), emprise])
    expect(recenterPrintPreviewOnPlace(map, null)).toBe(true)
    const view = map.getView()
    const visible = view.calculateExtent(map.getSize())
    expect(visible[0]).toBeLessThanOrEqual(5000)
    expect(visible[2]).toBeGreaterThanOrEqual(5200)
    expect(getCenter(visible)[0]).toBeCloseTo(5100, 0)
    expect(view.getZoom()).toBeGreaterThan(10)
  })

  it('sans emprise : cerise au centre, zoom inchangé', () => {
    const map = previewWith([new Feature(new Point([3000, -2000]))])
    const zoom = map.getView().getZoom()
    expect(recenterPrintPreviewOnPlace(map, null)).toBe(true)
    expect(map.getView().getCenter()).toEqual([3000, -2000])
    expect(map.getView().getZoom()).toBe(zoom)
  })

  it('cerise absente de l’aperçu : repli sur la position de la cerise fournie', () => {
    const map = previewWith([])
    expect(recenterPrintPreviewOnPlace(map, [700, 800])).toBe(true)
    expect(map.getView().getCenter()).toEqual([700, 800])
    expect(recenterPrintPreviewOnPlace(previewWith([]), null)).toBe(false)
  })
})

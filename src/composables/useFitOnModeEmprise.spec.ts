/**
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils'
import { defineComponent, h, shallowRef, type MaybeRefOrGetter } from 'vue'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import Feature from 'ol/Feature'
import OlMap from 'ol/Map'
import View from 'ol/View'
import Point from 'ol/geom/Point'
import Polygon from 'ol/geom/Polygon'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { useFitOnModeEmprise } from '@/composables/useFitOnModeEmprise'
import { MODE_EMPRISE_PROP, searchEngineLayerHostRef } from '@/lib/map/searchResultGraphics'
import { MAP_MODE_PARCEL, type MapModeId } from '@/lib/map/mapMode'
import { stubResizeObserver } from '@/test/olJsdom'

beforeAll(() => stubResizeObserver())
afterEach(() => {
  searchEngineLayerHostRef.value = null
  vi.useRealTimers()
})

function setup(mode: MaybeRefOrGetter<MapModeId> = MAP_MODE_PARCEL) {
  vi.useFakeTimers()
  const map = new OlMap({ view: new View({ center: [0, 0], zoom: 3 }) })
  map.setSize([800, 600])
  const layer = new VectorLayer({ source: new VectorSource() })
  searchEngineLayerHostRef.value = { getMap: () => map, layer: layer }
  const fit = vi.spyOn(map.getView(), 'fit')
  mount(
    defineComponent({
      setup() {
        useFitOnModeEmprise(shallowRef(map), mode)
        return () => h('div')
      },
    }),
  )
  return { map, source: layer.getSource()!, fit }
}

const square = new Polygon([
  [
    [1000, 1000],
    [1200, 1000],
    [1200, 1200],
    [1000, 1200],
    [1000, 1000],
  ],
])

describe('useFitOnModeEmprise', () => {
  it('emprise ajoutée sur la couche recherche : la vue est recentrée sur son étendue', () => {
    const { source, fit } = setup()
    const emprise = new Feature(square.clone())
    emprise.set(MODE_EMPRISE_PROP, 'parcel')
    source.addFeature(emprise)
    vi.runAllTimers()
    expect(fit).toHaveBeenCalledTimes(1)
    expect(fit.mock.calls[0][0]).toEqual([1000, 1000, 1200, 1200])
  })

  it('autre objet (cerise) : pas de recentrage', () => {
    const { source, fit } = setup()
    source.addFeature(new Feature(new Point([5, 5])))
    vi.runAllTimers()
    expect(fit).not.toHaveBeenCalled()
  })

  it('mode lu au moment du recentrage (sélecteur de mode de la démo fiche info)', () => {
    const mode = vi.fn(() => MAP_MODE_PARCEL)
    const { source, fit } = setup(mode)
    expect(mode).not.toHaveBeenCalled()
    const emprise = new Feature(square.clone())
    emprise.set(MODE_EMPRISE_PROP, 'parcel')
    source.addFeature(emprise)
    vi.runAllTimers()
    expect(fit).toHaveBeenCalledTimes(1)
    expect(mode).toHaveBeenCalled()
  })
})

import { describe, expect, it } from 'vitest'
import View from 'ol/View'
import type Map from 'ol/Map'
import {
  mapViewChangedSinceLastPlaceSearch,
  rememberLastPlaceSearch,
  scheduleCaptureSearchViewSnapshot,
} from '@/lib/search/placeSearchSubmitReplay'

function mapStub(view: View): Map {
  return {
    getView: () => view,
    once: (_type: string, listener: () => void) => listener(),
  } as unknown as Map
}

describe('placeSearchSubmitReplay', () => {
  it('considère la vue inchangée après capture moveend', () => {
    const view = new View({ center: [100, 200], zoom: 12 })
    const map = mapStub(view)
    rememberLastPlaceSearch({
      label: 'Paris',
      lon: 2.3,
      lat: 48.8,
      search: { fullText: 'Paris' },
      placeViewExtent: null,
    })
    scheduleCaptureSearchViewSnapshot(map)
    expect(mapViewChangedSinceLastPlaceSearch(map)).toBe(false)
  })

  it('détecte un pan après capture', () => {
    const view = new View({ center: [0, 0], zoom: 10 })
    const map = mapStub(view)
    rememberLastPlaceSearch({
      label: 'Lyon',
      lon: 4.8,
      lat: 45.7,
      search: { fullText: 'Lyon' },
      placeViewExtent: null,
    })
    scheduleCaptureSearchViewSnapshot(map)
    view.setCenter([5000, 5000])
    expect(mapViewChangedSinceLastPlaceSearch(map)).toBe(true)
  })
})

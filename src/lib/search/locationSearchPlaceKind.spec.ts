import { describe, expect, it } from 'vitest'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat } from 'ol/proj'
import {
  inferMapModeFromLocationPayload,
  inferMapModeFromPlaceKind,
  locationFromGeopfFeature,
  locationFromGeopfSelect,
} from '@/lib/search/locationSearch'
import { DEFAULT_MAP_MODE, MAP_MODE_PARCEL, MAP_MODE_TERRITORY } from '@/lib/map/mapMode'

describe('inferMapModeFromPlaceKind', () => {
  it('municipality → territoire', () => {
    expect(inferMapModeFromPlaceKind('municipality')).toBe(MAP_MODE_TERRITORY)
  })
  it('housenumber, street, locality → parcelle', () => {
    expect(inferMapModeFromPlaceKind('housenumber')).toBe(MAP_MODE_PARCEL)
    expect(inferMapModeFromPlaceKind('street')).toBe(MAP_MODE_PARCEL)
    expect(inferMapModeFromPlaceKind('locality')).toBe(MAP_MODE_PARCEL)
  })
  it('couches géocodage (StreetAddress) ignorées comme kind → défaut territoire', () => {
    expect(inferMapModeFromPlaceKind('StreetAddress')).toBe(DEFAULT_MAP_MODE)
  })
})

describe('inferMapModeFromLocationPayload', () => {
  it('StreetAddress sans placeKind → parcelle', () => {
    expect(
      inferMapModeFromLocationPayload({
        fullText: 'Rue X',
        position: { x: 2, y: 49 },
        type: 'StreetAddress',
      }),
    ).toBe(MAP_MODE_PARCEL)
  })
  it('PositionOfInterest sans placeKind → territoire', () => {
    expect(
      inferMapModeFromLocationPayload({
        fullText: 'Forêt',
        position: { x: 2, y: 49 },
        type: 'PositionOfInterest',
      }),
    ).toBe(MAP_MODE_TERRITORY)
  })
  it('placeKind municipality prioritaire sur StreetAddress', () => {
    expect(
      inferMapModeFromLocationPayload({
        fullText: 'Ville',
        position: { x: 2, y: 49 },
        type: 'StreetAddress',
        placeKind: 'municipality',
      }),
    ).toBe(MAP_MODE_TERRITORY)
  })
})

describe('locationFromGeopfFeature placeKind', () => {
  it('priorise properties.type (géocodage BAN) sur kind', () => {
    const c = fromLonLat([2.3, 48.9])
    const f = new Feature(new Point(c))
    f.set('kind', 'municipality')
    f.set('properties', { type: 'street' })
    const loc = locationFromGeopfFeature(f)
    expect(loc?.placeKind).toBe('street')
  })
  it('lit properties.type municipality', () => {
    const c = fromLonLat([2.3, 48.9])
    const f = new Feature(new Point(c))
    f.set('properties', { type: 'municipality' })
    const loc = locationFromGeopfFeature(f)
    expect(loc?.placeKind).toBe('municipality')
  })
})

describe('locationFromGeopfSelect placeKind', () => {
  it('lit item.properties.type', () => {
    const loc = locationFromGeopfSelect({
      item: {
        fullText: 'Ville',
        position: { x: 2.3, y: 48.9 },
        properties: { type: 'housenumber' },
      },
    })
    expect(loc?.placeKind).toBe('housenumber')
  })
  it('priorise item.properties.type sur item.kind', () => {
    const loc = locationFromGeopfSelect({
      item: {
        fullText: 'Rue',
        position: { x: 2.3, y: 48.9 },
        kind: 'municipality',
        properties: { type: 'street' },
      },
    })
    expect(loc?.placeKind).toBe('street')
  })
})

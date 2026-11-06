import { fromLonLat, toLonLat } from 'ol/proj'
import type Map from 'ol/Map'
import { LOCATION_SEARCH_ANIMATION_MS } from '@/lib/map/animateViewFit'
import { easeOut } from 'ol/easing'
import type Feature from 'ol/Feature'
import type { StandardViewerSearch } from '@/lib/types'
import {
  DEFAULT_MAP_MODE,
  MAP_MODE_PARCEL,
  MAP_MODE_TERRITORY,
  type MapModeId,
} from '@/lib/map/mapMode'

/** Zoom selon le type de résultat (comportement gpu-client LocateControl). */
export function zoomForLocationSearch(search: { type?: string; poiType?: string[] }): number {
  if (search.poiType?.includes('département')) return 9
  switch (search.type) {
    case 'StreetAddress':
      return 18
    case 'PositionOfInterest':
      return 13
    default:
      return 13
  }
}

/**
 * Centre la vue sur un résultat de recherche (coords lon/lat → projection carte).
 */
export function applySearchToMap(map: Map, search: StandardViewerSearch): boolean {
  const x = Number(search.position?.x)
  const y = Number(search.position?.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false

  const center = fromLonLat([x, y], map.getView().getProjection())
  const zoom = zoomForLocationSearch(search)
  map.getView().animate({
    center,
    zoom,
    duration: LOCATION_SEARCH_ANIMATION_MS,
    easing: easeOut,
  })
  return true
}

export interface LocationRedirectParams {
  municipality: string
  position_x: string
  position_y: string
  type: string
}

export interface LocationPayload {
  fullText: string
  position: { x: number; y: number }
  type?: string
  kind?: string
  /** Sous-type lieu (`municipality`, `housenumber`, …) — geopf feature / autocomplete. */
  placeKind?: string
  poiType?: string[]
}

const PLACE_KIND_TERRITORY = new Set(['municipality'])
const PLACE_KIND_PARCEL = new Set(['housenumber', 'street', 'locality'])

/** Couche / index géocodage geopf — pas un `kind` de lieu (`municipality`, `street`, …). */
const GEOCODING_LAYER_TYPES = new Set([
  'streetaddress',
  'positionofinterest',
  'cadastralparcel',
  'location',
])

function isGeocodingLayerType(raw: string | undefined | null): boolean {
  if (!raw) return false
  return GEOCODING_LAYER_TYPES.has(raw.trim().toLowerCase())
}

/**
 * Mode carte par défaut après recherche accueil (SearchEngine standalone) selon le sous-type lieu geopf.
 */
export function inferMapModeFromPlaceKind(placeKind: string | undefined | null): MapModeId {
  const explicit = inferMapModeFromPlaceKindExplicit(placeKind)
  return explicit ?? DEFAULT_MAP_MODE
}

/** `null` = pas de signal lieu (utiliser la couche `type` : StreetAddress, …). */
function inferMapModeFromPlaceKindExplicit(placeKind: string | undefined | null): MapModeId | null {
  const k = (placeKind ?? '').trim().toLowerCase()
  if (!k || isGeocodingLayerType(k)) return null
  if (PLACE_KIND_TERRITORY.has(k)) return MAP_MODE_TERRITORY
  if (PLACE_KIND_PARCEL.has(k)) return MAP_MODE_PARCEL
  return null
}

/**
 * Combine `placeKind` (properties) et la couche geopf (`StreetAddress` → adresse/rue → parcelle).
 */
export function inferMapModeFromLocationPayload(location: LocationPayload): MapModeId {
  const fromPlaceKind = inferMapModeFromPlaceKindExplicit(location.placeKind)
  if (fromPlaceKind != null) return fromPlaceKind

  const t = (location.type ?? '').trim().toLowerCase()
  if (t === 'streetaddress' || t === 'cadastralparcel') return MAP_MODE_PARCEL
  if (t === 'positionofinterest') return MAP_MODE_TERRITORY

  return DEFAULT_MAP_MODE
}

/**
 * Type de lieu BAN / géocodage (`municipality`, `street`, `housenumber`, …) — prioritaire sur `kind`
 * et sur la couche SearchEngine (`StreetAddress`, …). Voir réponses GeoJSON du service géocodage géopf.
 */
function pickPlaceKindFromGeopfItem(item: {
  kind?: string
  type?: string
  properties?: { type?: string }
}): string | undefined {
  const p = item.properties
  if (p && typeof p.type === 'string' && p.type.trim()) return p.type
  if (typeof item.kind === 'string' && item.kind.trim()) return item.kind
  if (typeof item.type === 'string' && item.type.trim() && !isGeocodingLayerType(item.type)) {
    return item.type
  }
  return undefined
}

function pickPlaceKindFromGeopfFeature(feature: Feature): string | undefined {
  const props = feature.get('properties')
  if (props && typeof props === 'object' && props !== null) {
    const p = props as { type?: string; kind?: string }
    if (typeof p.type === 'string' && p.type.trim()) return p.type
    if (typeof p.kind === 'string' && p.kind.trim()) return p.kind
  }
  const kind = feature.get('kind')
  if (typeof kind === 'string' && kind.trim()) return kind
  const typeTop = feature.get('type')
  if (typeof typeTop === 'string' && typeTop.trim() && !isGeocodingLayerType(typeTop)) {
    return typeTop
  }
  return undefined
}

export function toLocationRedirectParams(location: LocationPayload): LocationRedirectParams {
  return {
    municipality: location.fullText,
    position_x: String(location.position.x),
    position_y: String(location.position.y),
    type: location.type ?? '',
  }
}

/** Autocomplete / select geopf → payload redirect. */
export function locationFromGeopfSelect(event: {
  title?: string
  item?: {
    fullText?: string
    type?: string
    kind?: string
    properties?: { type?: string }
    poiType?: string[]
    position?: { x?: number; y?: number }
  }
}): LocationPayload | null {
  const item = event.item
  const x = Number(item?.position?.x)
  const y = Number(item?.position?.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const placeKind = item ? pickPlaceKindFromGeopfItem(item) : undefined
  return {
    fullText: item?.fullText || event.title || '',
    position: { x, y },
    type: item?.type,
    kind: item?.kind,
    placeKind,
    poiType: item?.poiType,
  }
}

/**
 * Feature résultat geopf (géométrie en EPSG:3857 typiquement) → payload redirect.
 */
export function locationFromGeopfFeature(
  feature: Feature,
  fallbackType = '',
): LocationPayload | null {
  const geometry = feature.getGeometry()
  if (!geometry || typeof geometry.getType !== 'function') {
    return null
  }

  let coord: number[] | null = null
  const geomType = geometry.getType()
  if (geomType === 'Point') {
    coord = (geometry as import('ol/geom/Point').default).getCoordinates()
  } else if (typeof geometry.getExtent === 'function') {
    const extent = geometry.getExtent()
    coord = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2]
  }
  if (!coord || coord.length < 2) return null

  const [lon, lat] = toLonLat(coord, 'EPSG:3857')
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null

  const infoPopup = String(feature.get('infoPopup') ?? '')
  const label =
    infoPopup
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || String(feature.get('fullText') ?? feature.get('label') ?? 'Localisation')

  const placeKind = pickPlaceKindFromGeopfFeature(feature)
  const geocodingLayerType = String(feature.get('type') ?? fallbackType)

  return {
    fullText: label,
    position: { x: lon, y: lat },
    /** Couche SearchEngine / geopf (`StreetAddress`, …), pas le type BAN (`placeKind`). */
    type: geocodingLayerType,
    placeKind,
  }
}

export function locationFromGeolocation(
  coordinates: number[],
  label = 'Ma localisation',
): LocationPayload | null {
  const x = Number(coordinates?.[0])
  const y = Number(coordinates?.[1])
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return {
    fullText: label,
    position: { x, y },
    type: 'geolocate',
  }
}

/**
 * Navigue vers la page carte via formulaire HTML (intégration site hôte / gpu-site).
 * Pour la démo SPA, préférer `prepareLocationHandoff` + `router.push` (pas de POST / query).
 */
export function redirectToMapWithLocation(
  location: LocationPayload,
  options: {
    mapUrl?: string
    method?: 'GET' | 'POST'
  } = {},
): void {
  const mapUrl = options.mapUrl ?? '/map/'
  const method = options.method ?? 'POST'
  const params = toLocationRedirectParams(location)

  if (method === 'GET') {
    const qs = new URLSearchParams({
      municipality: params.municipality,
      position_x: params.position_x,
      position_y: params.position_y,
      type: params.type,
    })
    window.location.assign(`${mapUrl}${mapUrl.includes('?') ? '&' : '?'}${qs.toString()}`)
    return
  }

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = mapUrl
  form.style.display = 'none'
  for (const [name, value] of Object.entries(params)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }
  document.body.appendChild(form)
  form.submit()
}

/** Handoff SPA synchrone : recherche + mode carte dérivé du sous-type lieu geopf. */
export type LocationSearchHandoff = {
  search: StandardViewerSearch
  mapMode: MapModeId
}

let pendingLocationHandoff: LocationSearchHandoff | null = null

/** Enregistre la localisation pour la prochaine vue carte (même document SPA). */
export function prepareLocationHandoff(location: LocationPayload): LocationSearchHandoff {
  const search = locationPayloadToSearch(location)
  const mapMode = inferMapModeFromLocationPayload(location)
  const handoff: LocationSearchHandoff = { search, mapMode }
  pendingLocationHandoff = handoff
  return handoff
}

/** Lit et consomme le handoff (une seule fois). */
export function takeLocationHandoff(): LocationSearchHandoff | null {
  const handoff = pendingLocationHandoff
  pendingLocationHandoff = null
  return handoff
}

/** Payload localisation → prop `initialSearch` du SearchEngineControl. */
export function locationPayloadToSearch(location: LocationPayload): StandardViewerSearch {
  return {
    fullText: location.fullText,
    type: location.type,
    kind: location.kind,
    placeKind: location.placeKind,
    poiType: location.poiType,
    position: location.position,
  }
}

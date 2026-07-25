import { fromLonLat, toLonLat } from 'ol/proj'
import type Map from 'ol/Map'
import type Feature from 'ol/Feature'
import type { StandardViewerSearch } from '@/lib/types'

/** Zoom selon le type de résultat (comportement gpu-client LocateControl). */
export function zoomForLocationSearch(search: {
  type?: string
  poiType?: string[]
}): number {
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
  map.getView().animate({ center, zoom, duration: 300 })
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
  poiType?: string[]
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
    poiType?: string[]
    position?: { x?: number; y?: number }
  }
}): LocationPayload | null {
  const item = event.item
  const x = Number(item?.position?.x)
  const y = Number(item?.position?.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return {
    fullText: item?.fullText || event.title || '',
    position: { x, y },
    type: item?.type,
    kind: item?.kind,
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
    infoPopup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ||
    String(feature.get('fullText') ?? feature.get('label') ?? 'Localisation')

  return {
    fullText: label,
    position: { x: lon, y: lat },
    type: String(feature.get('type') ?? fallbackType),
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

/** Handoff SPA synchrone : objet déjà au format `initialSearch` (pas de sérialisation). */
let pendingLocationSearch: StandardViewerSearch | null = null

/** Enregistre la localisation pour la prochaine vue carte (même document SPA). */
export function prepareLocationHandoff(
  location: LocationPayload,
): StandardViewerSearch {
  const search = locationPayloadToSearch(location)
  pendingLocationSearch = search
  return search
}

/** Lit et consomme le handoff (une seule fois). */
export function takeLocationHandoff(): StandardViewerSearch | null {
  const search = pendingLocationSearch
  pendingLocationSearch = null
  return search
}

/** Payload localisation → prop `initialSearch` du SearchEngineControl. */
export function locationPayloadToSearch(
  location: LocationPayload,
): StandardViewerSearch {
  return {
    fullText: location.fullText,
    type: location.type,
    kind: location.kind,
    poiType: location.poiType,
    position: location.position,
  }
}

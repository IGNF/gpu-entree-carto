import { fromLonLat } from 'ol/proj'
import type Map from 'ol/Map'
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

export function toLocationRedirectParams(location: {
  fullText: string
  position: { x: number; y: number }
  type?: string
}): LocationRedirectParams {
  return {
    municipality: location.fullText,
    position_x: String(location.position.x),
    position_y: String(location.position.y),
    type: location.type ?? '',
  }
}

/**
 * Navigue vers la page carte avec les paramètres de localisation (contrat gpu-site).
 */
export function redirectToMapWithLocation(
  location: {
    fullText: string
    position: { x: number; y: number }
    type?: string
  },
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

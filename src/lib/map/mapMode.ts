import {
  parseMapPermalinkHash,
  updateMapPermalinkParam,
  type MapPermalinkParams,
} from '@/lib/map/mapPermalink'

/** Mode fiche / clic info — aligné gpu-client (`mode=1` parcelle, `mode=2` territoire). */
export type MapModeId = 1 | 2

export const MAP_MODE_PARCEL: MapModeId = 1
export const MAP_MODE_TERRITORY: MapModeId = 2
export const DEFAULT_MAP_MODE: MapModeId = MAP_MODE_TERRITORY

export function normalizeMapMode(raw: unknown): MapModeId | null {
  if (raw === 1 || raw === 2) return raw
  if (raw === '1' || raw === '2') return Number(raw) as MapModeId
  if (typeof raw === 'string') {
    const n = parseInt(raw, 10)
    if (n === 1 || n === 2) return n
  }
  return null
}

export function readMapModeFromPermalinkParams(params: MapPermalinkParams): MapModeId | null {
  return normalizeMapMode(params.mode)
}

export function readMapModeFromSearchParams(search = ''): MapModeId | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return normalizeMapMode(params.get('mode'))
}

export function readMapModeFromPermalinkHash(hash: string): MapModeId | null {
  return readMapModeFromPermalinkParams(parseMapPermalinkHash(hash))
}

export function readMapModeFromLocation(
  loc: Pick<Location, 'search' | 'hash'> = window.location,
): MapModeId {
  return (
    readMapModeFromPermalinkHash(loc.hash) ??
    readMapModeFromSearchParams(loc.search) ??
    DEFAULT_MAP_MODE
  )
}

/** Retire `mode` de la query (legacy) après migration vers le fragment `#`. */
export function stripMapModeFromSearchParams(loc: Pick<Location, 'href'> = window.location): void {
  if (typeof window === 'undefined') return
  const url = new URL(loc.href)
  if (!url.searchParams.has('mode')) return
  url.searchParams.delete('mode')
  const qs = url.searchParams.toString()
  const search = qs ? `?${qs}` : ''
  const hash = url.hash
  window.history.replaceState(window.history.state, '', `${url.pathname}${search}${hash}`)
}

/** Met à jour `mode` dans le fragment permalink (`#mode=…`). */
export function writeMapModeToLocation(
  mode: MapModeId,
  loc: Pick<Location, 'href'> = window.location,
): void {
  if (typeof window === 'undefined') return
  updateMapPermalinkParam('mode', mode)
  stripMapModeFromSearchParams(loc)
}

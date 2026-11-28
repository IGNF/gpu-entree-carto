import {
  parseMapPermalinkHash,
  updateMapPermalinkParam,
  type MapPermalinkParams,
} from '@/lib/map/mapPermalink'

/**
 * Mode fiche / clic info — aligné gpu-client (`mode=1` parcelle, `mode=2` territoire) ;
 * `mode=3` coordonnées (entree-carto) : règles au point cliqué, inconnu de gpu-client.
 */
export type MapModeId = 1 | 2 | 3

export const MAP_MODE_PARCEL: MapModeId = 1
export const MAP_MODE_TERRITORY: MapModeId = 2
export const MAP_MODE_COORDINATES: MapModeId = 3
export const DEFAULT_MAP_MODE: MapModeId = MAP_MODE_TERRITORY
/** Tous les modes, dans l’ordre du sélecteur. */
export const ALL_MAP_MODES: readonly MapModeId[] = [
  MAP_MODE_COORDINATES,
  MAP_MODE_PARCEL,
  MAP_MODE_TERRITORY,
]

/** Modes activés (config `modes`) dans l’ordre du sélecteur ; absent, vide ou invalide = tous. */
export function normalizeMapModes(raw: unknown): MapModeId[] {
  const wanted = new Set(Array.isArray(raw) ? raw.map(normalizeMapMode) : [])
  const modes = ALL_MAP_MODES.filter((mode) => wanted.has(mode))
  return modes.length ? modes : [...ALL_MAP_MODES]
}

/** Mode demandé s’il est activé, sinon Territoire, sinon le premier mode activé. */
export function resolveEnabledMapMode(mode: MapModeId, modes: readonly MapModeId[]): MapModeId {
  if (modes.includes(mode)) return mode
  return modes.includes(DEFAULT_MAP_MODE) ? DEFAULT_MAP_MODE : (modes[0] ?? DEFAULT_MAP_MODE)
}

export function normalizeMapMode(raw: unknown): MapModeId | null {
  if (raw === 1 || raw === 2 || raw === 3) return raw
  if (typeof raw === 'string') {
    const n = parseInt(raw, 10)
    if (n === 1 || n === 2 || n === 3) return n
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

/** `mode` présent dans le fragment ou la query — sinon `null` (ne pas confondre avec le défaut territoire). */
export function readExplicitMapModeFromLocation(
  loc: Pick<Location, 'search' | 'hash'> = window.location,
): MapModeId | null {
  return readMapModeFromPermalinkHash(loc.hash) ?? readMapModeFromSearchParams(loc.search) ?? null
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

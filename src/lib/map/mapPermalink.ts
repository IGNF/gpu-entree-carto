/** Paramètres permalink carte (fragment `#`, aligné gpu-client PermalinkControl). */

export type MapPermalinkParams = Record<string, string>

export const MAP_PERMALINK_RESERVED_KEYS = new Set([
  'lon',
  'lat',
  'z',
  'zoom',
  'tile',
  'mlon',
  'mlat',
  'mode',
])

/** Précision WGS84 dans le fragment (gpu-client). */
export const MAP_PERMALINK_COORD_DECIMALS = 8

const MAP_PERMALINK_COORD_KEYS = new Set(['lon', 'lat', 'mlon', 'mlat'])

export function formatMapPermalinkCoord(value: number): string {
  return value.toFixed(MAP_PERMALINK_COORD_DECIMALS)
}

function formatMapPermalinkParamValue(key: string, value: string | number): string {
  if (MAP_PERMALINK_COORD_KEYS.has(key)) {
    const n = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(n)) return formatMapPermalinkCoord(n)
  }
  return String(value)
}

function normalizeCoordParamsInPlace(params: MapPermalinkParams): void {
  for (const key of MAP_PERMALINK_COORD_KEYS) {
    const raw = params[key]
    if (raw == null || raw === '') continue
    const n = Number(raw)
    if (Number.isFinite(n)) params[key] = formatMapPermalinkCoord(n)
  }
}

const HASH_DEBOUNCE_MS = 300

let cachedParams: MapPermalinkParams = {}
let hashDebounce: ReturnType<typeof setTimeout> | null = null

export function pathToPermalinkId(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

/** decodeURIComponent tolérant (hash gpu-client non encodé, ex. `%` dans `mec_mec_%_du_%`). */
export function decodeMapPermalinkComponent(part: string): string {
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}

export function parseMapPermalinkHash(hash: string): MapPermalinkParams {
  const raw = hash.replace(/^#/, '').trim()
  if (!raw) return {}
  const out: MapPermalinkParams = {}
  for (const part of raw.split('&')) {
    if (!part) continue
    const eq = part.indexOf('=')
    if (eq <= 0) continue
    const key = decodeMapPermalinkComponent(part.slice(0, eq))
    const value = decodeMapPermalinkComponent(part.slice(eq + 1))
    out[key] = value
  }
  return out
}

export function buildMapPermalinkHash(params: MapPermalinkParams): string {
  return Object.entries(params)
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

export function readMapPermalinkFromLocation(
  loc: Pick<Location, 'hash'> = typeof window !== 'undefined' ? window.location : { hash: '' },
): MapPermalinkParams {
  return parseMapPermalinkHash(loc.hash)
}

export function writeMapPermalinkToLocation(
  params: MapPermalinkParams,
  loc: Pick<Location, 'href'> = window.location,
): void {
  if (typeof window === 'undefined') return
  const encoded = buildMapPermalinkHash(params)
  const url = new URL(loc.href)
  const href = encoded ? `${url.pathname}${url.search}#${encoded}` : `${url.pathname}${url.search}`
  window.history.replaceState(window.history.state, '', href)
}

export function initMapPermalinkFromLocation(): MapPermalinkParams {
  cachedParams = readMapPermalinkFromLocation()
  normalizeCoordParamsInPlace(cachedParams)
  return { ...cachedParams }
}

/**
 * Réécrit le fragment avec encodeURIComponent (clés/valeurs).
 * Évite l’avertissement Vue Router sur les hash gpu-client non encodés (`%`, `,`, `:`…).
 */
/** true si le fragment provoque decodeURIComponent (ex. `%_` gpu-client) ou n’est pas canonical. */
export function mapPermalinkFragmentNeedsEncoding(
  raw: string,
  params: MapPermalinkParams,
): boolean {
  const trimmed = raw.replace(/^#/, '').trim()
  if (!trimmed) return false
  try {
    decodeURIComponent(trimmed)
  } catch {
    return true
  }
  return buildMapPermalinkHash(params) !== trimmed
}

export function normalizeMapPermalinkHashEncoding(
  loc: Pick<Location, 'href' | 'hash'> = typeof window !== 'undefined'
    ? window.location
    : { href: '', hash: '' },
): void {
  if (typeof window === 'undefined') return
  const raw = loc.hash.replace(/^#/, '').trim()
  if (!raw) return
  if (!mapPermalinkFragmentNeedsEncoding(raw, cachedParams)) return
  writeMapPermalinkToLocation(cachedParams, loc)
}

/** Lecture cache + normalisation encodage (avant navigation Vue Router si possible). */
export function bootstrapMapPermalinkFromLocation(
  loc: Pick<Location, 'href' | 'hash'> = typeof window !== 'undefined'
    ? window.location
    : { href: '', hash: '' },
): MapPermalinkParams {
  initMapPermalinkFromLocation()
  normalizeMapPermalinkHashEncoding(loc)
  return { ...cachedParams }
}

export function locationHashLooksLikeMapPermalink(
  loc: Pick<Location, 'hash'> = typeof window !== 'undefined' ? window.location : { hash: '' },
): boolean {
  const raw = loc.hash.replace(/^#/, '').trim()
  if (!raw) return false
  return (
    /(?:^|&)lon=/.test(raw) ||
    /(?:^|&)lat=/.test(raw) ||
    /(?:^|&)tile=/.test(raw) ||
    /(?:^|&)mlon=/.test(raw) ||
    /(?:^|&)mlat=/.test(raw)
  )
}

export function getMapPermalinkParams(): MapPermalinkParams {
  return { ...cachedParams }
}

export function updateMapPermalinkParam(
  key: string,
  value: string | number | null | undefined,
): void {
  if (value === null || value === undefined || value === '') {
    delete cachedParams[key]
  } else {
    cachedParams[key] = formatMapPermalinkParamValue(key, value)
  }
  scheduleMapPermalinkHashWrite()
}

export function setMapPermalinkParams(partial: MapPermalinkParams): void {
  for (const [key, value] of Object.entries(partial)) {
    if (value === '' || value == null) delete cachedParams[key]
    else cachedParams[key] = formatMapPermalinkParamValue(key, value)
  }
  scheduleMapPermalinkHashWrite()
}

/** Remplace les clés « couche » (hors réservées) tout en conservant vue / cerise / tuile. */
export function replaceLayerPermalinkParams(layerParams: MapPermalinkParams): void {
  for (const key of Object.keys(cachedParams)) {
    if (!MAP_PERMALINK_RESERVED_KEYS.has(key)) delete cachedParams[key]
  }
  Object.assign(cachedParams, layerParams)
  scheduleMapPermalinkHashWrite()
}

export function setMapPermalinkMarker(lon: number, lat: number): void {
  updateMapPermalinkParam('mlon', lon)
  updateMapPermalinkParam('mlat', lat)
  flushMapPermalinkHashNow()
}

export function flushMapPermalinkHashNow(): void {
  if (hashDebounce) {
    clearTimeout(hashDebounce)
    hashDebounce = null
  }
  writeMapPermalinkToLocation(cachedParams)
}

function scheduleMapPermalinkHashWrite(): void {
  if (typeof window === 'undefined') return
  if (hashDebounce) clearTimeout(hashDebounce)
  hashDebounce = setTimeout(() => {
    hashDebounce = null
    writeMapPermalinkToLocation(cachedParams)
  }, HASH_DEBOUNCE_MS)
}

export function readMapPermalinkZoom(params: MapPermalinkParams): number | null {
  const raw = params.z ?? params.zoom
  if (raw == null || raw === '') return null
  const z = Number(raw)
  return Number.isFinite(z) ? z : null
}

export function readMapPermalinkCenter(
  params: MapPermalinkParams,
): { lon: number; lat: number } | null {
  const lon = Number(params.lon)
  const lat = Number(params.lat)
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
  return { lon, lat }
}

export function readMapPermalinkMarker(
  params: MapPermalinkParams,
): { lon: number; lat: number } | null {
  const lon = Number(params.mlon)
  const lat = Number(params.mlat)
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
  return { lon, lat }
}

export function readMapPermalinkTileIndex(params: MapPermalinkParams): number | null {
  const n = Number(params.tile)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.floor(n)
}

export function layerPermalinkEntriesFromParams(
  params: MapPermalinkParams,
): Array<{ permalinkId: string; value: string }> {
  const out: Array<{ permalinkId: string; value: string }> = []
  for (const [key, value] of Object.entries(params)) {
    if (MAP_PERMALINK_RESERVED_KEYS.has(key)) continue
    if (!value) continue
    out.push({ permalinkId: key, value })
  }
  return out
}

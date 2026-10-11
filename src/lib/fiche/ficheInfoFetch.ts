import config from '@/lib/config'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import { resolveConfigUrlForFetch } from '@/lib/configUrls'
import { appendFicheInfoQueryParams } from '@/lib/fiche/ficheInfoQuery'
import {
  legacyFicheModeValue,
  resolveFicheInfoEndpointUrl,
  resolveFicheInfoFetchUrl,
  shouldAppendLegacyFicheModeParam,
} from '@/lib/fiche/ficheInfoApiUrls'
import { isGpuFicheInfoPayload, type GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import {
  parcelCacheKeyFromPayload,
  territoryCacheKeyFromPayload,
} from '@/lib/fiche/ficheInfoSelectionCache'

let lastKnownParcelCacheKey: string | null = null
let lastKnownTerritoryCacheKey: string | null = null

const inflightPayloadByPoint = new Map<string, Promise<GpuFicheInfoPayload | null>>()

function fichePayloadInflightKey(lon: number, lat: number, zoom: number): string {
  return `${lon.toFixed(6)}|${lat.toFixed(6)}|${Math.round(zoom)}`
}

export function rememberFicheInfoCacheKeysFromPayload(data: GpuFicheInfoPayload): void {
  lastKnownParcelCacheKey = parcelCacheKeyFromPayload(data)
  lastKnownTerritoryCacheKey = territoryCacheKeyFromPayload(data)
}

function appendClientCacheHints(url: URL, mode: MapModeId): void {
  if (mode === MAP_MODE_PARCEL && lastKnownParcelCacheKey) {
    url.searchParams.set('knownParcelId', lastKnownParcelCacheKey)
  }
  if (mode === MAP_MODE_TERRITORY && lastKnownTerritoryCacheKey) {
    url.searchParams.set('knownGridInsee', lastKnownTerritoryCacheKey.split('|')[0] ?? '')
  }
}

export async function fetchGpuFicheInfoPayload(params: {
  lon: number
  lat: number
  zoom: number
  mode: MapModeId
}): Promise<GpuFicheInfoPayload | null> {
  if (typeof window === 'undefined') return null

  const inflightKey = fichePayloadInflightKey(params.lon, params.lat, params.zoom)
  const existing = inflightPayloadByPoint.get(inflightKey)
  if (existing) return existing

  const promise = fetchGpuFicheInfoPayloadImpl(params).finally(() => {
    inflightPayloadByPoint.delete(inflightKey)
  })
  inflightPayloadByPoint.set(inflightKey, promise)
  return promise
}

async function fetchGpuFicheInfoPayloadImpl(params: {
  lon: number
  lat: number
  zoom: number
  mode: MapModeId
}): Promise<GpuFicheInfoPayload | null> {
  const primary = resolveFicheInfoFetchUrl(params.mode)
  const combined = resolveFicheInfoEndpointUrl('combined')
  const urls = [primary, combined].filter((u, i, arr): u is string =>
    Boolean(u && arr.indexOf(u) === i),
  )

  for (const fetchBase of urls) {
    const payload = await fetchGpuFicheInfoPayloadFromUrl(fetchBase, params)
    if (payload) return payload
  }
  return null
}

async function fetchGpuFicheInfoPayloadFromUrl(
  fetchBase: string,
  params: { lon: number; lat: number; zoom: number; mode: MapModeId },
): Promise<GpuFicheInfoPayload | null> {
  const resolved = resolveConfigUrlForFetch(fetchBase)
  const url = resolved.startsWith('/')
    ? new URL(resolved, window.location.origin)
    : new URL(resolved)

  appendFicheInfoQueryParams(url, params)
  appendClientCacheHints(url, params.mode)

  if (shouldAppendLegacyFicheModeParam(resolved)) {
    url.searchParams.set('mode', legacyFicheModeValue(params.mode))
  }

  const preferCombined = Boolean(
    'apiFicheInfoPreferCombined' in config &&
    (config as { apiFicheInfoPreferCombined?: boolean }).apiFicheInfoPreferCombined,
  )
  if (
    preferCombined &&
    url.pathname.includes('fiche-info-v2') &&
    !url.pathname.endsWith('/territoire') &&
    !url.pathname.endsWith('/parcelle')
  ) {
    url.searchParams.set('scope', 'both')
  }

  try {
    const res = await fetch(url.toString(), { credentials: 'same-origin' })
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (!isGpuFicheInfoPayload(data)) return null
    rememberFicheInfoCacheKeysFromPayload(data)
    return data
  } catch {
    return null
  }
}

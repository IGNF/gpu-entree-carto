import config from '@/lib/config'
import type { MapModeId } from '@/lib/map/mapMode'
import { resolveConfigUrlForFetch } from '@/lib/configUrls'
import { appendFicheInfoQueryParams } from '@/lib/fiche/ficheInfoQuery'
import {
  legacyFicheModeValue,
  resolveFicheInfoFetchUrl,
  shouldAppendLegacyFicheModeParam,
} from '@/lib/fiche/ficheInfoApiUrls'
import { isGpuFicheInfoPayload, type GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'

const inflightPayloadByPoint = new Map<string, Promise<GpuFicheInfoPayload | null>>()

let activeNetworkAbort: AbortController | null = null

export class FicheInfoFetchAborted extends Error {
  override name = 'FicheInfoFetchAborted'
}

function fichePayloadInflightKey(lon: number, lat: number, zoom: number, mode: MapModeId): string {
  return `${lon.toFixed(6)}|${lat.toFixed(6)}|${Math.round(zoom)}|${mode}`
}

function takeoverFicheNetworkSignal(external?: AbortSignal): AbortSignal {
  activeNetworkAbort?.abort()
  activeNetworkAbort = new AbortController()
  const { signal } = activeNetworkAbort
  if (external) {
    if (external.aborted) {
      activeNetworkAbort.abort()
    } else {
      external.addEventListener('abort', () => activeNetworkAbort?.abort(), { once: true })
    }
  }
  return signal
}

function clearInflightFichePayloads(): void {
  inflightPayloadByPoint.clear()
}

/** Annule le fetch réseau en cours (clic suivant) et vide les promesses partagées. */
export function abortInflightFicheInfoFetch(): void {
  activeNetworkAbort?.abort()
  activeNetworkAbort = null
  clearInflightFichePayloads()
}

export async function fetchGpuFicheInfoPayload(params: {
  lon: number
  lat: number
  zoom: number
  mode: MapModeId
  abortSignal?: AbortSignal
}): Promise<GpuFicheInfoPayload | null> {
  if (typeof window === 'undefined') return null

  const inflightKey = fichePayloadInflightKey(params.lon, params.lat, params.zoom, params.mode)
  const existing = inflightPayloadByPoint.get(inflightKey)
  if (existing) return existing

  const signal = takeoverFicheNetworkSignal(params.abortSignal)

  const promise = fetchGpuFicheInfoPayloadImpl(params, signal).finally(() => {
    inflightPayloadByPoint.delete(inflightKey)
    if (activeNetworkAbort?.signal === signal) {
      activeNetworkAbort = null
    }
  })
  inflightPayloadByPoint.set(inflightKey, promise)
  return promise
}

async function fetchGpuFicheInfoPayloadImpl(
  params: {
    lon: number
    lat: number
    zoom: number
    mode: MapModeId
  },
  signal: AbortSignal,
): Promise<GpuFicheInfoPayload | null> {
  const fetchBase = resolveFicheInfoFetchUrl(params.mode)
  if (!fetchBase) return null
  return fetchGpuFicheInfoPayloadFromUrl(fetchBase, params, signal)
}

async function fetchGpuFicheInfoPayloadFromUrl(
  fetchBase: string,
  params: { lon: number; lat: number; zoom: number; mode: MapModeId },
  signal: AbortSignal,
): Promise<GpuFicheInfoPayload | null> {
  const resolved = resolveConfigUrlForFetch(fetchBase)
  const url = resolved.startsWith('/')
    ? new URL(resolved, window.location.origin)
    : new URL(resolved)

  appendFicheInfoQueryParams(url, params)

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
    const res = await fetch(url.toString(), { credentials: 'same-origin', signal })
    if (res.status === 204) return null
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (!isGpuFicheInfoPayload(data)) return null
    return data
  } catch (err) {
    if (signal.aborted) return null
    if (err instanceof DOMException && err.name === 'AbortError') return null
    if (err instanceof Error && err.name === 'AbortError') return null
    return null
  }
}

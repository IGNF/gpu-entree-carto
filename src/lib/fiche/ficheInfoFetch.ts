import config from '@/lib/config'
import { MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import { resolveConfigUrlForFetch } from '@/lib/configUrls'
import { appendFicheInfoQueryParams, notifyFicheInfoSupersede } from '@/lib/fiche/ficheInfoQuery'
import {
  legacyFicheModeValue,
  resolveFicheInfoCombinedFetchUrl,
  resolveFicheInfoFetchUrl,
  shouldAppendLegacyFicheModeParam,
} from '@/lib/fiche/ficheInfoApiUrls'
import { isGpuFicheInfoPayload, type GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'

const inflightPayloadByPoint = new Map<string, Promise<GpuFicheInfoPayload | null>>()

/** Fetch « panneau » (clic / recherche) : un seul en vol, annulé au point suivant. */
let activePanelNetworkAbort: AbortController | null = null

/** Fetches emprise / enrichissement : annulés avec le panneau au clic suivant. */
const activeBackgroundNetworkAborts = new Set<AbortController>()

export class FicheInfoFetchAborted extends Error {
  override name = 'FicheInfoFetchAborted'
}

function fichePayloadInflightKey(
  lon: number,
  lat: number,
  zoom: number,
  mode: MapModeId | 'combined',
  activeFamilies?: string[],
): string {
  const families = activeFamilies?.length ? [...activeFamilies].sort().join(',') : 'all'
  return `${lon.toFixed(6)}|${lat.toFixed(6)}|${Math.round(zoom)}|${mode}|${families}`
}

export type FicheInfoFetchRole = 'panel' | 'background'

function takeoverFicheNetworkSignal(
  external?: AbortSignal,
  role: FicheInfoFetchRole = 'panel',
): AbortSignal {
  if (role === 'background') {
    const controller = new AbortController()
    activeBackgroundNetworkAborts.add(controller)
    controller.signal.addEventListener(
      'abort',
      () => activeBackgroundNetworkAborts.delete(controller),
      { once: true },
    )
    if (external?.aborted) {
      controller.abort()
    } else if (external) {
      external.addEventListener('abort', () => controller.abort(), { once: true })
    }
    return controller.signal
  }

  activePanelNetworkAbort?.abort()
  activePanelNetworkAbort = new AbortController()
  const { signal } = activePanelNetworkAbort
  if (external) {
    if (external.aborted) {
      activePanelNetworkAbort.abort()
    } else {
      external.addEventListener('abort', () => activePanelNetworkAbort?.abort(), { once: true })
    }
  }
  return signal
}

function clearInflightFichePayloads(): void {
  inflightPayloadByPoint.clear()
}

function resolveFicheInfoSupersedeBaseUrl(): string | null {
  return (
    resolveFicheInfoCombinedFetchUrl() ??
    resolveFicheInfoFetchUrl(MAP_MODE_TERRITORY) ??
    (typeof config.apiFicheInfoUrl === 'string' ? config.apiFicheInfoUrl.trim() : null) ??
    null
  )
}

/** Annule le fetch réseau en cours (clic suivant) et vide les promesses partagées. */
export function abortInflightFicheInfoFetch(): void {
  const hadPanel = activePanelNetworkAbort !== null
  activePanelNetworkAbort?.abort()
  activePanelNetworkAbort = null
  for (const controller of [...activeBackgroundNetworkAborts]) {
    controller.abort()
  }
  activeBackgroundNetworkAborts.clear()
  clearInflightFichePayloads()
  if (hadPanel) {
    const base = resolveFicheInfoSupersedeBaseUrl()
    if (base) notifyFicheInfoSupersede(base)
  }
}

/** v2 combinée : un pipeline WFS gpu-site pour territoire + parcelle (voir doc FicheInfoApi). */
export async function fetchGpuFicheInfoCombinedPayload(params: {
  lon: number
  lat: number
  zoom: number
  activeFamilies?: string[]
  abortSignal?: AbortSignal
  fetchRole?: FicheInfoFetchRole
}): Promise<GpuFicheInfoPayload | null> {
  if (typeof window === 'undefined') return null
  const fetchBase = resolveFicheInfoCombinedFetchUrl()
  if (!fetchBase) return null

  const inflightKey = fichePayloadInflightKey(
    params.lon,
    params.lat,
    params.zoom,
    'combined',
    params.activeFamilies,
  )
  const existing = inflightPayloadByPoint.get(inflightKey)
  if (existing) return existing

  const role = params.fetchRole ?? 'panel'
  const signal = takeoverFicheNetworkSignal(params.abortSignal, role)

  const promise = fetchGpuFicheInfoPayloadFromUrl(
    fetchBase,
    { ...params, mode: MAP_MODE_TERRITORY },
    signal,
  ).finally(() => {
    inflightPayloadByPoint.delete(inflightKey)
    if (role === 'panel' && activePanelNetworkAbort?.signal === signal) {
      activePanelNetworkAbort = null
    }
  })
  inflightPayloadByPoint.set(inflightKey, promise)
  return promise
}

export async function fetchGpuFicheInfoPayload(params: {
  lon: number
  lat: number
  zoom: number
  mode: MapModeId
  activeFamilies?: string[]
  abortSignal?: AbortSignal
  /** Emprise carte, enrichissement silencieux : n’annule pas le fetch panneau en cours. */
  fetchRole?: FicheInfoFetchRole
}): Promise<GpuFicheInfoPayload | null> {
  if (typeof window === 'undefined') return null

  const inflightKey = fichePayloadInflightKey(
    params.lon,
    params.lat,
    params.zoom,
    params.mode,
    params.activeFamilies,
  )
  const existing = inflightPayloadByPoint.get(inflightKey)
  if (existing) return existing

  const role = params.fetchRole ?? 'panel'
  const signal = takeoverFicheNetworkSignal(params.abortSignal, role)

  const promise = fetchGpuFicheInfoPayloadImpl(params, signal).finally(() => {
    inflightPayloadByPoint.delete(inflightKey)
    if (role === 'panel' && activePanelNetworkAbort?.signal === signal) {
      activePanelNetworkAbort = null
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
  params: { lon: number; lat: number; zoom: number; mode: MapModeId; activeFamilies?: string[] },
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

  if (
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

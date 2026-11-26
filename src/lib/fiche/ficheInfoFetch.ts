import config from '@/lib/config'
import { MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import { resolveConfigUrlForFetch } from '@/lib/configUrls'
import { appendFicheInfoQueryParams, notifyFicheInfoSupersede } from '@/lib/fiche/ficheInfoQuery'
import {
  resolveFicheInfoCombinedFetchUrl,
  resolveFicheInfoFetchUrl,
} from '@/lib/fiche/ficheInfoApiUrls'
import { isGpuFicheInfoPayload, type GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'

const inflightPayloadByPoint = new Map<string, Promise<GpuFicheInfoPayload | null>>()

/** Fetch « panneau » (clic / recherche) : un seul en vol, annulé au point suivant. */
let activePanelNetworkAbort: AbortController | null = null

/** Fetches emprise / enrichissement (→ clé de requête en vol) : annulés avec le panneau au clic suivant. */
const activeBackgroundNetworkAborts = new Map<AbortController, string>()

/** Dernier fetch « panneau » refusé par la limitation de débit de gpu-site (HTTP 429). */
let lastPanelFetchRateLimited = false

export function wasLastFicheInfoPanelFetchRateLimited(): boolean {
  return lastPanelFetchRateLimited
}

export class FicheInfoFetchAborted extends Error {
  override name = 'FicheInfoFetchAborted'
}

/**
 * Clé de partage d’une requête en vol, sans le zoom : la réponse de gpu-site n’en dépend pas
 * (la fiche réutilise ainsi l’emprise lancée après une recherche, une seule requête comptée).
 */
function fichePayloadInflightKey(
  lon: number,
  lat: number,
  mode: MapModeId | 'combined',
  activeFamilies?: string[],
  activeSupTypes?: string[] | null,
): string {
  const families = activeFamilies?.length ? [...activeFamilies].sort().join(',') : 'all'
  const supTypes = activeSupTypes?.length ? [...activeSupTypes].sort().join(',') : 'all-sup'
  return `${lon.toFixed(6)}|${lat.toFixed(6)}|${mode}|${families}|${supTypes}`
}

export type FicheInfoFetchRole = 'panel' | 'background'

function takeoverFicheNetworkSignal(
  external: AbortSignal | undefined,
  role: FicheInfoFetchRole,
  inflightKey: string,
): AbortSignal {
  if (role === 'background') {
    const controller = new AbortController()
    activeBackgroundNetworkAborts.set(controller, inflightKey)
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

function resolveFicheInfoSupersedeBaseUrl(): string | null {
  return (
    resolveFicheInfoCombinedFetchUrl() ??
    resolveFicheInfoFetchUrl(MAP_MODE_TERRITORY) ??
    (typeof config.apiFicheInfoUrl === 'string' ? config.apiFicheInfoUrl.trim() : null) ??
    null
  )
}

/** Début de clé de requête en vol propre à un point. */
function fichePointInflightPrefix(point: { lon: number; lat: number }): string {
  return `${point.lon.toFixed(6)}|${point.lat.toFixed(6)}|`
}

/**
 * Annule le fetch réseau en cours (clic suivant) et vide les promesses partagées.
 * `keepBackgroundAt` : les fetches emprise (arrière-plan) de ce point continuent et restent
 * partagés — la fiche qui démarre au même point les réutilise (une seule requête au chargement).
 * Les fetches panneau sont toujours annulés : une requête annulée ne doit jamais être partagée.
 */
export function abortInflightFicheInfoFetch(options?: {
  keepBackgroundAt?: { lon: number; lat: number }
}): void {
  const hadPanel = activePanelNetworkAbort !== null
  activePanelNetworkAbort?.abort()
  activePanelNetworkAbort = null
  const keepPrefix = options?.keepBackgroundAt
    ? fichePointInflightPrefix(options.keepBackgroundAt)
    : null
  const keptKeys = new Set<string>()
  for (const [controller, key] of [...activeBackgroundNetworkAborts]) {
    if (keepPrefix && key.startsWith(keepPrefix)) {
      keptKeys.add(key)
      continue
    }
    controller.abort()
    activeBackgroundNetworkAborts.delete(controller)
  }
  for (const key of [...inflightPayloadByPoint.keys()]) {
    if (!keptKeys.has(key)) inflightPayloadByPoint.delete(key)
  }
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
  activeSupTypes?: string[] | null
  abortSignal?: AbortSignal
  fetchRole?: FicheInfoFetchRole
}): Promise<GpuFicheInfoPayload | null> {
  if (typeof window === 'undefined') return null
  // Appel déjà dépassé : ni requête en cours partagée (servie ensuite à l’appel courant), ni reprise du signal panneau.
  if (params.abortSignal?.aborted) return null
  const fetchBase = resolveFicheInfoCombinedFetchUrl()
  if (!fetchBase) return null

  const inflightKey = fichePayloadInflightKey(
    params.lon,
    params.lat,
    'combined',
    params.activeFamilies,
    params.activeSupTypes,
  )
  const existing = inflightPayloadByPoint.get(inflightKey)
  if (existing) return existing

  const role = params.fetchRole ?? 'panel'
  const signal = takeoverFicheNetworkSignal(params.abortSignal, role, inflightKey)

  const promise = fetchGpuFicheInfoPayloadFromUrl(
    fetchBase,
    { ...params, mode: MAP_MODE_TERRITORY },
    signal,
    role,
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
  activeSupTypes?: string[] | null
  abortSignal?: AbortSignal
  /** Emprise carte, enrichissement silencieux : n’annule pas le fetch panneau en cours. */
  fetchRole?: FicheInfoFetchRole
}): Promise<GpuFicheInfoPayload | null> {
  if (typeof window === 'undefined') return null
  // Appel déjà dépassé : ni requête en cours partagée (servie ensuite à l’appel courant), ni reprise du signal panneau.
  if (params.abortSignal?.aborted) return null

  const inflightKey = fichePayloadInflightKey(
    params.lon,
    params.lat,
    params.mode,
    params.activeFamilies,
    params.activeSupTypes,
  )
  const existing = inflightPayloadByPoint.get(inflightKey)
  if (existing) return existing

  const role = params.fetchRole ?? 'panel'
  const signal = takeoverFicheNetworkSignal(params.abortSignal, role, inflightKey)

  const promise = fetchGpuFicheInfoPayloadImpl(params, signal, role).finally(() => {
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
  role: FicheInfoFetchRole,
): Promise<GpuFicheInfoPayload | null> {
  const fetchBase = resolveFicheInfoFetchUrl(params.mode)
  if (!fetchBase) return null
  return fetchGpuFicheInfoPayloadFromUrl(fetchBase, params, signal, role)
}

async function fetchGpuFicheInfoPayloadFromUrl(
  fetchBase: string,
  params: {
    lon: number
    lat: number
    zoom: number
    mode: MapModeId
    activeFamilies?: string[]
    activeSupTypes?: string[] | null
  },
  signal: AbortSignal,
  role: FicheInfoFetchRole,
): Promise<GpuFicheInfoPayload | null> {
  const resolved = resolveConfigUrlForFetch(fetchBase)
  const url = resolved.startsWith('/')
    ? new URL(resolved, window.location.origin)
    : new URL(resolved)

  appendFicheInfoQueryParams(url, params, role === 'panel')

  if (!url.pathname.endsWith('/territoire') && !url.pathname.endsWith('/parcelle')) {
    url.searchParams.set('scope', 'both')
  }

  const sendSessionCookies =
    url.searchParams.get('zone') === 'validation' || url.searchParams.has('previewDocumentId')

  if (role === 'panel') lastPanelFetchRateLimited = false
  try {
    const res = await fetch(url.toString(), {
      credentials: sendSessionCookies ? 'include' : 'same-origin',
      signal,
    })
    if (res.status === 204) return null
    if (res.status === 429 && role === 'panel') lastPanelFetchRateLimited = true
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

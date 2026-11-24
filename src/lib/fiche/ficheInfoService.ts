import config from '@/lib/config'
import { ficheServiceUnavailableSelection } from '@/lib/fiche/ficheRetry'
import type { StandardViewerSearch } from '@/lib/types'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import type { FicheInfoSelection } from '@/composables/tabPanels'
import { TAB_PANEL_IDS, tabPanelsApiRef } from '@/composables/tabPanels'
import { watch } from 'vue'
import { showMapLocationMarker } from '@/composables/mapLocationMarker'
import { escapeHtml, FICHE_LOADING_SPINNER_HTML } from '@/lib/fiche/ficheInfoHtml'
import {
  whenGpuClientConfigReady,
  waitUntilGpuClientConfigScriptSettled,
} from '@/lib/demo/gpuClientConfigState'
import {
  finalizeGpuClientConfigStateIfInjected,
  syncEntreeConfigFromGpuScript,
} from '@/lib/demo/demoConfig'
import { readMapModeFromPermalinkParams } from '@/lib/map/mapMode'
import { readMapPermalinkZoom } from '@/lib/map/mapPermalink'
import { syncCadastreLowFromFicheSelectionRaw } from '@/lib/fiche/cadastreLowFromFicheInfo'
import {
  abortInflightFicheInfoFetch,
  fetchGpuFicheInfoCombinedPayload,
  fetchGpuFicheInfoPayload,
} from '@/lib/fiche/ficheInfoFetch'
import { preferFicheInfoV2CombinedFetch } from '@/lib/fiche/ficheInfoApiUrls'
import {
  ficheSelectionFromGpuApi,
  isGpuFicheInfoPayload,
  refreshFicheSelectionCatalogVisibility,
  type GpuFicheInfoPayload,
} from '@/lib/fiche/ficheInfoFromGpuApi'
import { ficheHasParcelAtPoint } from '@/lib/fiche/ficheAvailability'
import { mergeParcelHintIntoTerritoryPayload } from '@/lib/fiche/ficheInfoTerritoryParcelHint'
import {
  applyParcelFicheDetailCache,
  getParcelFicheDetailCache,
  parcelIdFromSelection,
  storeParcelFicheDetailCache,
} from '@/lib/fiche/parcelFicheDetailCache'
import {
  buildParcelDocumentsHtmlFromFiche,
  buildParcelInfosHtmlFromFiche,
  fetchGpuParcelFiche,
  type GpuParcelFichePayload,
} from '@/lib/fiche/parcelFicheFromGpuApi'
import { getMapPermalinkParams, readMapPermalinkMarker } from '@/lib/map/mapPermalink'
import {
  seedModeEmpriseCacheFromFichePayload,
  syncModeEmpriseToSearchLayer,
} from '@/lib/map/searchResultGraphics'
import {
  type FicheInfoApiFamily,
  isCatalogDrivenFicheFetchEnabled,
  missingFicheInfoFamilies,
  resolveFicheInfoActiveFamiliesForFetch,
  familiesForTerritoryNetworkFetch,
  unionFicheInfoFamilies,
} from '@/lib/fiche/ficheActiveFamilies'
import {
  activeSupTypesForFetch,
  catalogFicheAcquisitionComplete,
  missingFicheInfoSupTypes,
  type AcquiredSupTypes,
  resolveFicheInfoActiveSupTypesForFetch,
  unionAcquiredSupTypes,
} from '@/lib/fiche/ficheActiveSupTypes'
import { mergeGpuFicheInfoPayloads } from '@/lib/fiche/ficheInfoPayloadMerge'

const FICHE_UNAVAILABLE_BODY = '<p>Indisponibilité du service</p>'
const FICHE_PARCEL_UNAVAILABLE_BODY =
  '<p>Indisponibilité du service fiche parcelle (API gpu-site requise).</p>'

/** Ignore les réponses API arrivées après un clic plus récent. */
let mapPointRequestSeq = 0

let mapPointFetchAbort: AbortController | null = null

const FICHE_POINT_EPS = 1e-7

type FichePointCache = {
  lon: number
  lat: number
  /** Familles déjà récupérées au point (requêtes gpu-site partielles fusionnées). */
  acquiredFamilies: FicheInfoApiFamily[]
  /** `null` = jeu SUP complet déjà obtenu (requête sans filtre `activeSupTypes`). */
  acquiredSupTypes: AcquiredSupTypes
  mergedGpuPayload: GpuFicheInfoPayload | null
  byMode: Partial<Record<MapModeId, FicheInfoSelection>>
}

/** Fiches déjà chargées au point cerise (une entrée par mode). */
let fichePointCache: FichePointCache | null = null

function sameMapPoint(a: { lon: number; lat: number }, b: { lon: number; lat: number }): boolean {
  return Math.abs(a.lon - b.lon) <= FICHE_POINT_EPS && Math.abs(a.lat - b.lat) <= FICHE_POINT_EPS
}

function syncFichePointCache(lon: number, lat: number): void {
  if (!fichePointCache || !sameMapPoint(fichePointCache, { lon, lat })) {
    fichePointCache = {
      lon,
      lat,
      acquiredFamilies: [],
      acquiredSupTypes: new Set(),
      mergedGpuPayload: null,
      byMode: {},
    }
  }
}

function recordGpuPayloadAcquisition(
  lon: number,
  lat: number,
  payload: GpuFicheInfoPayload,
  fetchedFamilies: FicheInfoApiFamily[],
  fetchedSupTypes: string[] | null | undefined,
): GpuFicheInfoPayload {
  syncFichePointCache(lon, lat)
  const merged = fichePointCache!.mergedGpuPayload
    ? mergeGpuFicheInfoPayloads(fichePointCache!.mergedGpuPayload, payload)
    : payload
  fichePointCache!.mergedGpuPayload = merged
  fichePointCache!.acquiredFamilies = unionFicheInfoFamilies(
    fichePointCache!.acquiredFamilies,
    fetchedFamilies,
  )
  fichePointCache!.acquiredSupTypes = unionAcquiredSupTypes(
    fichePointCache!.acquiredSupTypes,
    fetchedSupTypes,
  )
  return merged
}

async function fetchFicheGpuPayloadAtPoint(
  params: { lon: number; lat: number; zoom: number; mode: MapModeId },
  activeFamilies: FicheInfoApiFamily[],
  activeSupTypes: string[] | null,
  signal: AbortSignal,
): Promise<GpuFicheInfoPayload | null> {
  const queryArgs = { activeFamilies, activeSupTypes: activeSupTypes ?? undefined }
  if (preferFicheInfoV2CombinedFetch()) {
    return fetchGpuFicheInfoCombinedPayload({
      lon: params.lon,
      lat: params.lat,
      zoom: params.zoom,
      ...queryArgs,
      abortSignal: signal,
    })
  }
  return fetchGpuFicheInfoPayload({ ...params, ...queryArgs, abortSignal: signal })
}

function storeFicheInCache(
  mode: MapModeId,
  lon: number,
  lat: number,
  selection: FicheInfoSelection,
): void {
  syncFichePointCache(lon, lat)
  fichePointCache!.byMode[mode] = selection
}

function cachedFicheForMode(mode: MapModeId, lon: number, lat: number): FicheInfoSelection | null {
  if (!fichePointCache || !sameMapPoint(fichePointCache, { lon, lat })) return null
  return fichePointCache.byMode[mode] ?? null
}

/**
 * Le cache conserve le JSON brut : on recompose Infos / onglets territoire selon le catalogue actif
 * (évite une fiche territoire vide figée avant la première sync catalogue).
 */
function hydrateFicheSelectionFromCache(
  cached: FicheInfoSelection,
  mode: MapModeId,
): FicheInfoSelection {
  const refreshed = refreshFicheSelectionCatalogVisibility({ ...cached, mapMode: mode })
  return withParcelDetailCache(refreshed, mode)
}

/** Met à jour l’entrée cache de l’autre mode au même point (JSON partagé, visibilité catalogue courante). */
function syncSiblingFicheCacheAtPoint(lon: number, lat: number, activeMode: MapModeId): void {
  const sibling = activeMode === MAP_MODE_TERRITORY ? MAP_MODE_PARCEL : MAP_MODE_TERRITORY
  const cached = cachedFicheForMode(sibling, lon, lat)
  if (!cached) return
  storeFicheInCache(sibling, lon, lat, hydrateFicheSelectionFromCache(cached, sibling))
}

/** Fiche en cache au point cerise du permalink (impression / bascule mode). */
export function getCachedFicheSelectionAtMarker(mode: MapModeId): FicheInfoSelection | null {
  const marker = readMapPermalinkMarker(getMapPermalinkParams())
  if (!marker) return null
  const cached = cachedFicheForMode(mode, marker.lon, marker.lat)
  if (!cached) return null
  return hydrateFicheSelectionFromCache(cached, mode)
}

/** Bascule la fiche au changement de mode si une cerise est présente (sans refetch si en cache). */
export function refreshFicheForMapModeChange(mode: MapModeId, zoom: number): void {
  const marker = readMapPermalinkMarker(getMapPermalinkParams())
  if (!marker) return
  const cached = cachedFicheForMode(mode, marker.lon, marker.lat)
  if (cached) {
    const hydrated = hydrateFicheSelectionFromCache(cached, mode)
    storeFicheInCache(mode, marker.lon, marker.lat, hydrated)
    showFiche(hydrated)
    return
  }
  void loadFicheForMapPoint({
    lon: marker.lon,
    lat: marker.lat,
    mode,
    zoom,
    markerPlacedAtClick: true,
    skipLocationMarker: true,
  })
}

/** URL fiche GPU (injectée par gpu-client-config / `gpu.config`), sinon indisponible. */
export function resolveApiFicheInfoUrl(): string | null {
  const raw = config.apiFicheInfoUrl
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length ? trimmed : null
}

export function isFicheInfoApiConfigured(): boolean {
  return resolveApiFicheInfoUrl() != null
}

function showLoading(title: string): void {
  tabPanelsApiRef.value?.showSelection({
    title,
    loading: 'data',
    bodyHtml: FICHE_LOADING_SPINNER_HTML,
  })
}

/** Cerise présente dans le permalink — après chargement gpu-client-config. */
export function loadFicheForCherryFromPermalink(): void {
  const marker = readMapPermalinkMarker(getMapPermalinkParams())
  if (!marker) return
  const params = getMapPermalinkParams()
  const mode = readMapModeFromPermalinkParams(params) ?? MAP_MODE_TERRITORY
  const zoom = readMapPermalinkZoom(params) ?? 14
  void loadFicheForMapPoint({
    lon: marker.lon,
    lat: marker.lat,
    mode,
    zoom,
    markerPlacedAtClick: true,
    skipLocationMarker: true,
  })
}

let cherryFicheLoadQueued = false

/** Attend la config GPU et TabPanels, puis charge la fiche si mlon/mlat sont dans le permalink. */
export function scheduleFicheLoadForCherryWhenReady(): void {
  if (cherryFicheLoadQueued) return
  if (!readMapPermalinkMarker(getMapPermalinkParams())) return
  syncEntreeConfigFromGpuScript()
  finalizeGpuClientConfigStateIfInjected()
  cherryFicheLoadQueued = true
  whenGpuClientConfigReady(() => {
    cherryFicheLoadQueued = false
    const run = () => loadFicheForCherryFromPermalink()
    if (tabPanelsApiRef.value) {
      run()
      return
    }
    const stop = watch(tabPanelsApiRef, (api) => {
      if (api) {
        stop()
        run()
      }
    })
  })
}

/** Ne pas voler le focus si l’utilisateur consulte un autre onglet (catalogue, légendes…). */
function shouldFocusFicheTabOnPublish(): boolean {
  const api = tabPanelsApiRef.value
  if (!api?.isOpen.value) return true
  if (api.activeTab.value == null) return true
  return api.activeTab.value === TAB_PANEL_IDS.fiche
}

function showFiche(selection: FicheInfoSelection): void {
  syncCadastreLowFromFicheSelectionRaw(selection.raw)
  const api = tabPanelsApiRef.value
  if (!api) return
  if (shouldFocusFicheTabOnPublish()) {
    api.showSelection(selection)
  } else {
    api.updateSelection(selection)
  }
}

function readFicheCherryPoint(): { lon: number; lat: number } | null {
  const fromPermalink = readMapPermalinkMarker(getMapPermalinkParams())
  if (fromPermalink) return fromPermalink
  if (fichePointCache) return { lon: fichePointCache.lon, lat: fichePointCache.lat }
  const raw = tabPanelsApiRef.value?.selection.value?.raw
  const lon = Number(raw?.lon)
  const lat = Number(raw?.lat)
  if (Number.isFinite(lon) && Number.isFinite(lat)) return { lon, lat }
  return null
}

/** Réaffiche la fiche courante après changement de visibilité catalogue (permalink). */
export function refreshFicheForCatalogVisibility(): void {
  const api = tabPanelsApiRef.value
  const current = api?.selection.value
  if (!current?.raw || current.loading) return

  const desired = resolveFicheInfoActiveFamiliesForFetch()
  const desiredSup = resolveFicheInfoActiveSupTypesForFetch()
  const missingFamilies =
    fichePointCache && isCatalogDrivenFicheFetchEnabled()
      ? missingFicheInfoFamilies(desired, fichePointCache.acquiredFamilies)
      : []
  const missingSup =
    fichePointCache && isCatalogDrivenFicheFetchEnabled()
      ? missingFicheInfoSupTypes(desiredSup, fichePointCache.acquiredSupTypes)
      : []

  if (missingFamilies.length > 0 || missingSup.length > 0) {
    void (async () => {
      try {
        await ensureFicheCatalogSupplementAtMarker()
      } catch (err) {
        console.error('[fiche] ensureFicheCatalogSupplementAtMarker', err)
        return
      }
      const after = tabPanelsApiRef.value?.selection.value
      if (!after?.raw || after.loading) return
      const next = refreshFicheSelectionCatalogVisibility(after)
      syncCadastreLowFromFicheSelectionRaw(next.raw)
      tabPanelsApiRef.value?.updateSelection(next)
      persistFicheCacheAfterCatalogRefresh(next)
    })()
    return
  }

  const next = refreshFicheSelectionCatalogVisibility(current)
  syncCadastreLowFromFicheSelectionRaw(next.raw)
  api?.updateSelection(next)
  persistFicheCacheAfterCatalogRefresh(next)
}

function persistFicheCacheAfterCatalogRefresh(next: FicheInfoSelection): void {
  const lon = Number(next.raw?.lon)
  const lat = Number(next.raw?.lat)
  const activeMode = next.mapMode ?? readMapModeFromPermalinkParams(getMapPermalinkParams())
  if (Number.isFinite(lon) && Number.isFinite(lat) && activeMode) {
    storeFicheInCache(activeMode, lon, lat, next)
    syncSiblingFicheCacheAtPoint(lon, lat, activeMode)
  }

  const parcelId = parcelIdFromSelection(next)
  if (
    parcelId &&
    next.parcelInfosHtml?.trim() &&
    next.parcelDocumentsHtml?.trim() &&
    next.raw &&
    typeof next.raw === 'object'
  ) {
    const parcelFiche = next.raw._parcelFiche as GpuParcelFichePayload | undefined
    if (parcelFiche) {
      storeParcelFicheDetailCache({
        parcelId,
        parcelFiche,
        parcelInfosHtml: next.parcelInfosHtml,
        parcelDocumentsHtml: next.parcelDocumentsHtml,
      })
    }
  }
}

/** Complète familles / types SUP manquants au point cerise lors d’un changement catalogue. */
export async function ensureFicheCatalogSupplementAtMarker(): Promise<void> {
  if (!isCatalogDrivenFicheFetchEnabled()) return
  const cherry = readFicheCherryPoint()
  if (!cherry || !fichePointCache || !sameMapPoint(fichePointCache, cherry)) return
  if (!fichePointCache.mergedGpuPayload) return

  const { lon, lat } = cherry
  const desired = resolveFicheInfoActiveFamiliesForFetch()
  const desiredSup = resolveFicheInfoActiveSupTypesForFetch()
  const missingFamilies = missingFicheInfoFamilies(desired, fichePointCache.acquiredFamilies)
  const missingSup = missingFicheInfoSupTypes(desiredSup, fichePointCache.acquiredSupTypes)
  if (!missingFamilies.length && !missingSup.length) return

  const params = getMapPermalinkParams()
  const mode = readMapModeFromPermalinkParams(params) ?? MAP_MODE_TERRITORY
  const zoom = readMapPermalinkZoom(params) ?? 14

  await waitUntilGpuClientConfigScriptSettled()
  syncEntreeConfigFromGpuScript()
  finalizeGpuClientConfigStateIfInjected()
  if (!resolveApiFicheInfoUrl()) return

  const requestId = ++mapPointRequestSeq
  mapPointFetchAbort?.abort()
  abortInflightFicheInfoFetch()
  mapPointFetchAbort = new AbortController()

  const familiesToFetch: FicheInfoApiFamily[] = missingFamilies.length
    ? familiesForTerritoryNetworkFetch(missingFamilies, mode)
    : ['sup']
  const supTypesToFetch =
    missingSup.length > 0
      ? missingSup
      : activeSupTypesForFetch(
          familiesToFetch,
          fichePointCache.acquiredFamilies,
          fichePointCache.acquiredSupTypes,
        )

  const partial = await fetchFicheGpuPayloadAtPoint(
    { lon, lat, zoom, mode },
    [...familiesToFetch],
    supTypesToFetch,
    mapPointFetchAbort.signal,
  )
  if (!partial || requestId !== mapPointRequestSeq) return

  const merged = recordGpuPayloadAcquisition(
    lon,
    lat,
    partial,
    [...familiesToFetch],
    supTypesToFetch,
  )
  storeDualModeFicheCacheFromCombinedPayload(lon, lat, merged)
  for (const mapMode of [MAP_MODE_TERRITORY, MAP_MODE_PARCEL] as const) {
    const selection = selectionFromGpuPayload(merged, mapMode, lon, lat)
    storeFicheInCache(mapMode, lon, lat, selection)
  }
  const displayed = hydrateFicheSelectionFromCache(
    cachedFicheForMode(mode, lon, lat) ?? selectionFromGpuPayload(merged, mode, lon, lat),
    mode,
  )
  showFiche(displayed)
}

/** Alias historique — complément catalogue au point cerise. */
export const ensureFicheFamiliesForCatalogAtMarker = ensureFicheCatalogSupplementAtMarker

/** Cerise geopf au point interrogé (fiche-info gpu-site). */
function syncFicheLocationMarker(lon: number, lat: number): void {
  showMapLocationMarker(lon, lat, {
    label: '',
    origin: 'ficheInfo',
    center: false,
  })
}

function withParcelDetailCache(selection: FicheInfoSelection, mode: MapModeId): FicheInfoSelection {
  if (mode !== MAP_MODE_PARCEL) return selection
  return applyParcelFicheDetailCache(selection)
}

function applyMapPointResult(
  requestId: number,
  lon: number,
  lat: number,
  mode: MapModeId,
  selection: FicheInfoSelection,
  markerPlacedAtClick: boolean,
  skipLocationMarker: boolean,
  silent: boolean,
): FicheInfoSelection | null {
  if (requestId !== mapPointRequestSeq) return null
  const resolved = withParcelDetailCache(selection, mode)
  storeFicheInCache(mode, lon, lat, resolved)
  if (!silent) {
    showFiche(resolved)
    if (!skipLocationMarker && !markerPlacedAtClick) {
      syncFicheLocationMarker(lon, lat)
    }
  }
  syncModeEmpriseToSearchLayer(lon, lat, mode)
  return resolved
}

function selectionFromGpuPayload(
  data: Parameters<typeof ficheSelectionFromGpuApi>[0],
  mode: MapModeId,
  lon: number,
  lat: number,
): FicheInfoSelection {
  return ficheSelectionFromGpuApi(data, mode, lon, lat)
}

/** Après un seul GET v2 combiné, évite un second passage serveur au changement de mode. */
function storeDualModeFicheCacheFromCombinedPayload(
  lon: number,
  lat: number,
  payload: GpuFicheInfoPayload,
  displayMode?: MapModeId,
): void {
  seedModeEmpriseCacheFromFichePayload(lon, lat, payload)
  for (const mode of [MAP_MODE_TERRITORY, MAP_MODE_PARCEL] as const) {
    const selection = withParcelDetailCache(selectionFromGpuPayload(payload, mode, lon, lat), mode)
    storeFicheInCache(mode, lon, lat, selection)
  }
  syncModeEmpriseToSearchLayer(lon, lat, displayMode)
}

async function enrichTerritoryPayloadWithParcelAtPoint(
  params: { lon: number; lat: number; zoom: number },
  territoryPayload: GpuFicheInfoPayload,
  requestId: number,
  abortSignal: AbortSignal,
): Promise<GpuFicheInfoPayload> {
  if (ficheHasParcelAtPoint(territoryPayload)) return territoryPayload

  const cachedParcel = cachedFicheForMode(MAP_MODE_PARCEL, params.lon, params.lat)
  const cachedRaw = cachedParcel?.raw
  if (cachedRaw && isGpuFicheInfoPayload(cachedRaw)) {
    return mergeParcelHintIntoTerritoryPayload(territoryPayload, cachedRaw)
  }

  const parcelPayload = await fetchGpuFicheInfoPayload({
    ...params,
    mode: MAP_MODE_PARCEL,
    activeFamilies: resolveFicheInfoActiveFamiliesForFetch(),
    abortSignal,
  })
  if (abortSignal.aborted || requestId !== mapPointRequestSeq) return territoryPayload
  if (!parcelPayload || !ficheHasParcelAtPoint(parcelPayload)) return territoryPayload

  storeFicheInCache(
    MAP_MODE_PARCEL,
    params.lon,
    params.lat,
    selectionFromGpuPayload(parcelPayload, MAP_MODE_PARCEL, params.lon, params.lat),
  )
  return mergeParcelHintIntoTerritoryPayload(territoryPayload, parcelPayload)
}

async function loadFicheForMapPointImpl(params: {
  lon: number
  lat: number
  mode: MapModeId
  zoom: number
  loadingTitle?: string
  markerPlacedAtClick?: boolean
  skipLocationMarker?: boolean
  silent?: boolean
}): Promise<FicheInfoSelection | null> {
  const requestId = ++mapPointRequestSeq
  mapPointFetchAbort?.abort()
  abortInflightFicheInfoFetch()
  mapPointFetchAbort = new AbortController()
  const fetchAbortSignal = mapPointFetchAbort.signal
  const markerPlacedAtClick = params.markerPlacedAtClick === true
  const skipLocationMarker = params.skipLocationMarker === true
  const silent = params.silent === true
  syncFichePointCache(params.lon, params.lat)
  const loadingTitle =
    params.loadingTitle ?? (params.mode === MAP_MODE_PARCEL ? 'Parcelle' : 'Document d’urbanisme')

  const desiredFamilies = resolveFicheInfoActiveFamiliesForFetch()
  const acquisitionComplete =
    fichePointCache &&
    catalogFicheAcquisitionComplete(
      desiredFamilies,
      fichePointCache.acquiredFamilies,
      fichePointCache.acquiredSupTypes,
    )
  const cachedAtPoint = cachedFicheForMode(params.mode, params.lon, params.lat)
  if (cachedAtPoint && acquisitionComplete) {
    const hydrated = hydrateFicheSelectionFromCache(cachedAtPoint, params.mode)
    return applyMapPointResult(
      requestId,
      params.lon,
      params.lat,
      params.mode,
      hydrated,
      markerPlacedAtClick,
      skipLocationMarker,
      silent,
    )
  }
  if (!cachedAtPoint && acquisitionComplete && fichePointCache?.mergedGpuPayload) {
    const selection = selectionFromGpuPayload(
      fichePointCache.mergedGpuPayload,
      params.mode,
      params.lon,
      params.lat,
    )
    return applyMapPointResult(
      requestId,
      params.lon,
      params.lat,
      params.mode,
      withParcelDetailCache(selection, params.mode),
      markerPlacedAtClick,
      skipLocationMarker,
      silent,
    )
  }

  if (!silent) {
    showLoading(loadingTitle)
  }

  await waitUntilGpuClientConfigScriptSettled()
  // Dépassé pendant l’attente de la config (ex. double chargement de la cerise au rechargement).
  if (fetchAbortSignal.aborted || requestId !== mapPointRequestSeq) return null
  syncEntreeConfigFromGpuScript()
  finalizeGpuClientConfigStateIfInjected()

  const apiUrl = resolveApiFicheInfoUrl()
  if (!apiUrl) {
    const body =
      params.mode === MAP_MODE_PARCEL ? FICHE_PARCEL_UNAVAILABLE_BODY : FICHE_UNAVAILABLE_BODY
    return applyMapPointResult(
      requestId,
      params.lon,
      params.lat,
      params.mode,
      { title: loadingTitle, bodyHtml: body, raw: { source: 'fiche-service-unavailable' } },
      markerPlacedAtClick,
      skipLocationMarker,
      silent,
    )
  }

  const missingFamilies =
    isCatalogDrivenFicheFetchEnabled() && fichePointCache?.mergedGpuPayload
      ? missingFicheInfoFamilies(desiredFamilies, fichePointCache.acquiredFamilies)
      : desiredFamilies
  const familiesToFetch = familiesForTerritoryNetworkFetch(
    missingFamilies.length ? missingFamilies : desiredFamilies,
    params.mode,
  )
  const acquiredFamilies = fichePointCache?.acquiredFamilies ?? []
  const supTypesToFetch = activeSupTypesForFetch(
    familiesToFetch,
    acquiredFamilies,
    fichePointCache?.acquiredSupTypes ?? new Set(),
  )

  let payload = await fetchFicheGpuPayloadAtPoint(
    params,
    familiesToFetch,
    supTypesToFetch,
    fetchAbortSignal,
  )
  if (fetchAbortSignal.aborted || requestId !== mapPointRequestSeq) return null
  if (!payload) {
    return applyMapPointResult(
      requestId,
      params.lon,
      params.lat,
      params.mode,
      ficheServiceUnavailableSelection(loadingTitle, {
        lon: params.lon,
        lat: params.lat,
        mode: params.mode,
        zoom: params.zoom,
        loadingTitle: params.loadingTitle,
      }),
      markerPlacedAtClick,
      skipLocationMarker,
      silent,
    )
  }

  payload = recordGpuPayloadAcquisition(
    params.lon,
    params.lat,
    payload,
    familiesToFetch,
    supTypesToFetch,
  )

  const useCombinedV2 = preferFicheInfoV2CombinedFetch()
  if (useCombinedV2) {
    storeDualModeFicheCacheFromCombinedPayload(params.lon, params.lat, payload, params.mode)
  } else if (params.mode === MAP_MODE_TERRITORY) {
    payload = await enrichTerritoryPayloadWithParcelAtPoint(
      { lon: params.lon, lat: params.lat, zoom: params.zoom },
      payload,
      requestId,
      fetchAbortSignal,
    )
    if (fetchAbortSignal.aborted || requestId !== mapPointRequestSeq) return null
  }

  const selection = selectionFromGpuPayload(payload, params.mode, params.lon, params.lat)
  if (!useCombinedV2) {
    storeFicheInCache(params.mode, params.lon, params.lat, selection)
  }
  return applyMapPointResult(
    requestId,
    params.lon,
    params.lat,
    params.mode,
    selection,
    markerPlacedAtClick,
    skipLocationMarker,
    silent,
  )
}

export function loadFicheForMapPoint(params: {
  lon: number
  lat: number
  mode: MapModeId
  zoom: number
  loadingTitle?: string
  /** Cerise déjà posée au clic — ne met à jour que la popup à la fin de la requête. */
  markerPlacedAtClick?: boolean
  /** Ne pas appeler createMarker (ex. résultat SearchEngine : conserver cerise + emprise). */
  skipLocationMarker?: boolean
  /** Ne pas mettre à jour le panneau fiche (ex. préparation impression). */
  silent?: boolean
}): Promise<FicheInfoSelection | null> {
  return new Promise((resolve) => {
    whenGpuClientConfigReady(() => {
      void loadFicheForMapPointImpl(params).then(resolve, () => resolve(null))
    })
  })
}

export async function loadFicheForSearch(
  search: StandardViewerSearch,
  mode: MapModeId,
  zoom = 6,
): Promise<void> {
  const label = search.fullText?.trim()
  if (!label) return

  const x = Number(search.position?.x)
  const y = Number(search.position?.y)
  const hasCoords = Number.isFinite(x) && Number.isFinite(y)

  if (hasCoords) {
    await loadFicheForMapPoint({
      lon: x,
      lat: y,
      mode,
      zoom,
      loadingTitle: label,
      skipLocationMarker: true,
    })
    return
  }

  if (mode === MAP_MODE_TERRITORY) {
    const parts: string[] = [`<p><strong>${escapeHtml(label)}</strong></p>`]
    if (search.type) parts.push(`<p>Type : ${escapeHtml(String(search.type))}</p>`)
    showFiche({
      title: label,
      bodyHtml: parts.join(''),
      raw: {
        fullText: label,
        type: search.type ?? null,
        kind: search.kind ?? null,
        poiType: search.poiType ?? [],
        mode,
      },
    })
    return
  }

  showFiche({
    title: label,
    bodyHtml: `<p><strong>${escapeHtml(label)}</strong></p><p>Coordonnées absentes — zoomez et cliquez sur la parcelle.</p>`,
    raw: { fullText: label, mode },
  })
}

/** Charge la fiche parcelle complète (Infos + Documents) en un seul appel. */
export async function loadParcelFicheDetail(
  selection: FicheInfoSelection,
  options?: { silent?: boolean },
): Promise<FicheInfoSelection> {
  const silent = options?.silent === true
  const parcelId = parcelIdFromSelection(selection)
  if (!parcelId) {
    throw new Error('Identifiant parcelle indisponible')
  }

  const cachedDetail = getParcelFicheDetailCache(parcelId)
  if (cachedDetail) {
    const next = applyParcelFicheDetailCache(selection)
    if (!silent) {
      showFiche(next)
    }
    const marker = readMapPermalinkMarker(getMapPermalinkParams())
    if (marker) {
      storeFicheInCache(MAP_MODE_PARCEL, marker.lon, marker.lat, next)
    }
    return next
  }

  const raw: Record<string, unknown> = {
    ...(selection.raw && typeof selection.raw === 'object' ? selection.raw : {}),
  }
  let payload = raw._parcelFiche as GpuParcelFichePayload | undefined
  if (!payload) {
    payload = await fetchGpuParcelFiche(parcelId)
    raw._parcelFiche = payload
    raw.parcelId = parcelId
  }
  const parcelInfosHtml = buildParcelInfosHtmlFromFiche(
    payload,
    undefined,
    isGpuFicheInfoPayload(raw) ? raw : null,
  )
  const ficheApi = isGpuFicheInfoPayload(raw) ? raw : null
  const parcelDocumentsHtml = buildParcelDocumentsHtmlFromFiche(payload, ficheApi)
  storeParcelFicheDetailCache({
    parcelId,
    parcelFiche: payload,
    parcelInfosHtml,
    parcelDocumentsHtml,
  })
  const next: FicheInfoSelection = {
    ...selection,
    raw,
    parcelInfosHtml,
    parcelDocumentsHtml,
  }
  if (!silent) {
    showFiche(next)
  }
  const marker = readMapPermalinkMarker(getMapPermalinkParams())
  if (marker) {
    storeFicheInCache(MAP_MODE_PARCEL, marker.lon, marker.lat, next)
  }
  return next
}

export { MAP_MODE_PARCEL, MAP_MODE_TERRITORY }

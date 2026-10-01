import type { FeatureCollection } from 'geojson'
import config from '@/lib/config'
import type { StandardViewerSearch } from '@/lib/types'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import type { FicheInfoSelection } from '@/composables/tabPanels'
import { tabPanelsApiRef } from '@/composables/tabPanels'
import { watch } from 'vue'
import { showMapLocationMarker } from '@/composables/mapLocationMarker'
import { escapeHtml, FICHE_LOADING_SPINNER_HTML, htmlParagraph } from '@/lib/fiche/ficheInfoHtml'
import { whenGpuClientConfigReady } from '@/lib/demo/gpuClientConfigState'
import {
  finalizeGpuClientConfigStateIfInjected,
  syncEntreeConfigFromGpuScript,
} from '@/lib/demo/demoConfig'
import { readMapModeFromPermalinkParams } from '@/lib/map/mapMode'
import { readMapPermalinkZoom } from '@/lib/map/mapPermalink'
import { resolveConfigUrlForFetch } from '@/lib/configUrls'
import { syncCadastreLowFromFicheSelectionRaw } from '@/lib/fiche/cadastreLowFromFicheInfo'
import { ficheSelectionFromGpuApi, isGpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import { getMapPermalinkParams, readMapPermalinkMarker } from '@/lib/map/mapPermalink'

const APICARTO_PARCEL = 'https://apicarto.ign.fr/api/cadastre/parcelle'

const FICHE_UNAVAILABLE_BODY = '<p>Indisponibilité du service</p>'

/** Ignore les réponses APICarto / API arrivées après un clic plus récent. */
let mapPointRequestSeq = 0

const FICHE_POINT_EPS = 1e-7

type FichePointCache = {
  lon: number
  lat: number
  byMode: Partial<Record<MapModeId, FicheInfoSelection>>
}

/** Fiches déjà chargées au point cerise (une entrée par mode). */
let fichePointCache: FichePointCache | null = null

function sameMapPoint(a: { lon: number; lat: number }, b: { lon: number; lat: number }): boolean {
  return Math.abs(a.lon - b.lon) <= FICHE_POINT_EPS && Math.abs(a.lat - b.lat) <= FICHE_POINT_EPS
}

function syncFichePointCache(lon: number, lat: number): void {
  if (!fichePointCache || !sameMapPoint(fichePointCache, { lon, lat })) {
    fichePointCache = { lon, lat, byMode: {} }
  }
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

/** Bascule la fiche au changement de mode si une cerise est présente (sans refetch si en cache). */
export function refreshFicheForMapModeChange(mode: MapModeId, zoom: number): void {
  const marker = readMapPermalinkMarker(getMapPermalinkParams())
  if (!marker) return
  const cached = cachedFicheForMode(mode, marker.lon, marker.lat)
  if (cached) {
    showFiche(cached)
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

function pointGeomParam(lon: number, lat: number): string {
  return encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [lon, lat] }))
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

function ficheServiceUnavailableSelection(title: string): FicheInfoSelection {
  return {
    title,
    bodyHtml: FICHE_UNAVAILABLE_BODY,
    raw: { source: 'fiche-service-unavailable' },
  }
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

function showFiche(selection: FicheInfoSelection): void {
  syncCadastreLowFromFicheSelectionRaw(selection.raw)
  tabPanelsApiRef.value?.showSelection(selection)
}

/** Cerise geopf au point interrogé (GetFeatureInfo / APICarto). */
function syncFicheLocationMarker(lon: number, lat: number): void {
  showMapLocationMarker(lon, lat, {
    label: '',
    origin: 'ficheInfo',
    center: false,
  })
}

function applyMapPointResult(
  requestId: number,
  lon: number,
  lat: number,
  mode: MapModeId,
  selection: FicheInfoSelection,
  markerPlacedAtClick: boolean,
  skipLocationMarker: boolean,
): FicheInfoSelection | null {
  if (requestId !== mapPointRequestSeq) return null
  storeFicheInCache(mode, lon, lat, selection)
  showFiche(selection)
  if (!skipLocationMarker && !markerPlacedAtClick) {
    syncFicheLocationMarker(lon, lat)
  }
  return selection
}

async function fetchGeoJson(url: string): Promise<FeatureCollection> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as FeatureCollection
}

async function tryGpuSiteFiche(
  apiBase: string,
  params: {
    lon: number
    lat: number
    mode: MapModeId
    zoom: number
  },
): Promise<FicheInfoSelection | null> {
  if (typeof window === 'undefined') return null
  const fetchBase = resolveConfigUrlForFetch(apiBase)
  const url = fetchBase.startsWith('/')
    ? new URL(fetchBase, window.location.origin)
    : new URL(fetchBase)
  url.searchParams.set('lon', String(params.lon))
  url.searchParams.set('lat', String(params.lat))
  url.searchParams.set('mode', String(params.mode))
  url.searchParams.set('zoom', String(Math.round(params.zoom)))
  try {
    const res = await fetch(url.toString(), { credentials: 'same-origin' })
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (isGpuFicheInfoPayload(data)) {
      return ficheSelectionFromGpuApi(data, params.mode, params.lon, params.lat)
    }
    const record = data as Record<string, unknown>
    const title = String(record.title ?? record.name ?? 'Informations')
    const bodyHtml = String(
      record.bodyHtml ??
        record.html ??
        record.content ??
        record.body ??
        '<p>Informations disponibles.</p>',
    )
    const raw =
      record.raw && typeof record.raw === 'object'
        ? (record.raw as Record<string, unknown>)
        : record
    return { title, bodyHtml, raw }
  } catch {
    return null
  }
}

function parcelFromApicarto(
  lon: number,
  lat: number,
  props: Record<string, unknown>,
): FicheInfoSelection {
  const section = String(props.section ?? '')
  const numero = String(props.numero ?? '')
  const idu = String(props.idu ?? '')
  const title = idu
    ? `Parcelle ${idu}`
    : section && numero
      ? `Parcelle ${section} ${numero}`
      : 'Parcelle cadastrale'
  const parts = [
    htmlParagraph('Commune', String(props.nom_com ?? '')),
    htmlParagraph('Section', section),
    htmlParagraph('Numéro', numero),
    htmlParagraph('Contenance', props.contenance != null ? `${props.contenance} m²` : ''),
    htmlParagraph('Code INSEE', String(props.code_insee ?? '')),
    htmlParagraph('Coordonnées', `${lon.toFixed(5)}, ${lat.toFixed(5)}`),
  ].filter(Boolean)
  return {
    title,
    bodyHtml: parts.join('') || '<p>Parcelle identifiée.</p>',
    raw: { ...props, lon, lat, source: 'apicarto-cadastre' },
  }
}

async function ficheParcelFromApicarto(lon: number, lat: number): Promise<FicheInfoSelection> {
  const geo = await fetchGeoJson(`${APICARTO_PARCEL}?geom=${pointGeomParam(lon, lat)}`)
  const feature = geo.features?.[0]
  if (!feature?.properties) {
    return {
      title: 'Parcelle',
      bodyHtml: '<p>Aucune parcelle cadastrale à cet emplacement.</p>',
      raw: { lon, lat, mode: MAP_MODE_PARCEL },
    }
  }
  return parcelFromApicarto(lon, lat, feature.properties as Record<string, unknown>)
}

async function loadFicheForMapPointImpl(params: {
  lon: number
  lat: number
  mode: MapModeId
  zoom: number
  loadingTitle?: string
  markerPlacedAtClick?: boolean
  skipLocationMarker?: boolean
}): Promise<FicheInfoSelection | null> {
  const requestId = ++mapPointRequestSeq
  const markerPlacedAtClick = params.markerPlacedAtClick === true
  const skipLocationMarker = params.skipLocationMarker === true
  syncFichePointCache(params.lon, params.lat)
  const loadingTitle =
    params.loadingTitle ?? (params.mode === MAP_MODE_PARCEL ? 'Parcelle' : 'Document d’urbanisme')
  showLoading(loadingTitle)

  const apiUrl = resolveApiFicheInfoUrl()

  if (params.mode === MAP_MODE_TERRITORY) {
    if (!apiUrl) {
      return applyMapPointResult(
        requestId,
        params.lon,
        params.lat,
        params.mode,
        ficheServiceUnavailableSelection(loadingTitle),
        markerPlacedAtClick,
        skipLocationMarker,
      )
    }
    const fromSite = await tryGpuSiteFiche(apiUrl, params)
    const selection = fromSite ?? ficheServiceUnavailableSelection(loadingTitle)
    return applyMapPointResult(
      requestId,
      params.lon,
      params.lat,
      params.mode,
      selection,
      markerPlacedAtClick,
      skipLocationMarker,
    )
  }

  if (apiUrl) {
    const fromSite = await tryGpuSiteFiche(apiUrl, params)
    if (fromSite) {
      return applyMapPointResult(
        requestId,
        params.lon,
        params.lat,
        params.mode,
        fromSite,
        markerPlacedAtClick,
        skipLocationMarker,
      )
    }
  }

  try {
    const selection = await ficheParcelFromApicarto(params.lon, params.lat)
    return applyMapPointResult(
      requestId,
      params.lon,
      params.lat,
      params.mode,
      selection,
      markerPlacedAtClick,
      skipLocationMarker,
    )
  } catch {
    const fallback: FicheInfoSelection = {
      title: loadingTitle,
      bodyHtml: `<p>Impossible de charger les informations (${escapeHtml(String(params.lon))}, ${escapeHtml(String(params.lat))}).</p>`,
      raw: { lon: params.lon, lat: params.lat, mode: params.mode },
    }
    return applyMapPointResult(
      requestId,
      params.lon,
      params.lat,
      params.mode,
      fallback,
      markerPlacedAtClick,
      skipLocationMarker,
    )
  }
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
}): Promise<FicheInfoSelection | null> {
  return new Promise((resolve) => {
    whenGpuClientConfigReady(() => {
      void loadFicheForMapPointImpl(params).then(resolve)
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

export { MAP_MODE_PARCEL, MAP_MODE_TERRITORY }

import type { FeatureCollection } from 'geojson'
import config from '@/lib/config'
import type { StandardViewerSearch } from '@/lib/types'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import type { FicheInfoSelection } from '@/composables/tabPanels'
import { tabPanelsApiRef } from '@/composables/tabPanels'
import { showMapLocationMarker } from '@/composables/mapLocationMarker'
import { escapeHtml, htmlParagraph } from '@/lib/fiche/ficheInfoHtml'

const APICARTO_GPU = 'https://apicarto.ign.fr/api/gpu/document'
const APICARTO_PARCEL = 'https://apicarto.ign.fr/api/cadastre/parcelle'

/** Ignore les réponses APICarto / API arrivées après un clic plus récent. */
let mapPointRequestSeq = 0

function pointGeomParam(lon: number, lat: number): string {
  return encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [lon, lat] }))
}

function showLoading(title: string): void {
  tabPanelsApiRef.value?.showSelection({
    title,
    bodyHtml: '<p>Chargement des informations…</p>',
  })
}

function showFiche(selection: FicheInfoSelection): void {
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
  selection: FicheInfoSelection,
  markerPlacedAtClick: boolean,
  skipLocationMarker: boolean,
): FicheInfoSelection | null {
  if (requestId !== mapPointRequestSeq) return null
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

async function tryGpuSiteFiche(params: {
  lon: number
  lat: number
  mode: MapModeId
  zoom: number
}): Promise<FicheInfoSelection | null> {
  if (typeof window === 'undefined') return null
  const base = String(config.apiFicheInfoUrl ?? '/api/fiche-info')
  const url = new URL(base, window.location.origin)
  url.searchParams.set('lon', String(params.lon))
  url.searchParams.set('lat', String(params.lat))
  url.searchParams.set('mode', String(params.mode))
  url.searchParams.set('zoom', String(Math.round(params.zoom)))
  try {
    const res = await fetch(url.toString(), { credentials: 'same-origin' })
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    const title = String(data.title ?? data.name ?? 'Informations')
    const bodyHtml = String(
      data.bodyHtml ?? data.html ?? data.content ?? data.body ?? '<p>Informations disponibles.</p>',
    )
    const raw =
      data.raw && typeof data.raw === 'object' ? (data.raw as Record<string, unknown>) : data
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

function documentFromApicarto(
  lon: number,
  lat: number,
  props: Record<string, unknown>,
): FicheInfoSelection {
  const duType = String(props.du_type ?? props.type ?? 'Document')
  const gridTitle = String(props.grid_title ?? props.grid_name ?? '')
  const name = String(props.name ?? props.partition ?? 'Document d’urbanisme')
  const title = gridTitle ? `${duType} — ${gridTitle}` : name
  const parts = [
    htmlParagraph('Document', name),
    htmlParagraph('Type', duType),
    htmlParagraph('Commune', gridTitle),
    htmlParagraph('Statut GPU', String(props.gpu_status ?? '')),
    htmlParagraph('Identifiant', String(props.gpu_doc_id ?? props.id ?? '')),
    htmlParagraph('Coordonnées', `${lon.toFixed(5)}, ${lat.toFixed(5)}`),
  ].filter(Boolean)
  return {
    title,
    bodyHtml: parts.join('') || '<p>Document d’urbanisme identifié.</p>',
    raw: { ...props, lon, lat, source: 'apicarto-gpu-document' },
  }
}

async function ficheFromApicarto(
  lon: number,
  lat: number,
  mode: MapModeId,
  zoom: number,
): Promise<FicheInfoSelection> {
  if (mode === MAP_MODE_PARCEL) {
    const minZoom = Number(config.minZoomLevelForParcel ?? 12)
    if (zoom < minZoom) {
      return {
        title: 'Parcelle',
        bodyHtml: `<p>Zoomez au niveau ${minZoom} ou au-delà pour interroger une parcelle au clic.</p>`,
        raw: { lon, lat, zoom, mode },
      }
    }
    const geo = await fetchGeoJson(`${APICARTO_PARCEL}?geom=${pointGeomParam(lon, lat)}`)
    const feature = geo.features?.[0]
    if (!feature?.properties) {
      return {
        title: 'Parcelle',
        bodyHtml: '<p>Aucune parcelle cadastrale à cet emplacement.</p>',
        raw: { lon, lat, mode },
      }
    }
    return parcelFromApicarto(lon, lat, feature.properties as Record<string, unknown>)
  }

  const geo = await fetchGeoJson(`${APICARTO_GPU}?geom=${pointGeomParam(lon, lat)}`)
  const feature = geo.features?.[0]
  if (!feature?.properties) {
    return {
      title: 'Document d’urbanisme',
      bodyHtml: '<p>Aucun document d’urbanisme connu à cet emplacement.</p>',
      raw: { lon, lat, mode },
    }
  }
  return documentFromApicarto(lon, lat, feature.properties as Record<string, unknown>)
}

export async function loadFicheForMapPoint(params: {
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
  const requestId = ++mapPointRequestSeq
  const markerPlacedAtClick = params.markerPlacedAtClick === true
  const skipLocationMarker = params.skipLocationMarker === true
  const loadingTitle =
    params.loadingTitle ?? (params.mode === MAP_MODE_PARCEL ? 'Parcelle' : 'Document d’urbanisme')
  showLoading(loadingTitle)

  const fromSite = await tryGpuSiteFiche(params)
  if (fromSite) {
    return applyMapPointResult(
      requestId,
      params.lon,
      params.lat,
      fromSite,
      markerPlacedAtClick,
      skipLocationMarker,
    )
  }
  try {
    const selection = await ficheFromApicarto(params.lon, params.lat, params.mode, params.zoom)
    return applyMapPointResult(
      requestId,
      params.lon,
      params.lat,
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
      fallback,
      markerPlacedAtClick,
      skipLocationMarker,
    )
  }
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

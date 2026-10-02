import { shallowRef } from 'vue'
import Feature from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import { createEmpty, extend, isEmpty } from 'ol/extent'
import type { Extent } from 'ol/extent'
import { Fill, Stroke, Style } from 'ol/style'
import type Map from 'ol/Map'
import type { Feature as GeoJsonFeature, FeatureCollection } from 'geojson'
import {
  MAP_MODE_PARCEL,
  MAP_MODE_TERRITORY,
  normalizeMapMode,
  type MapModeId,
} from '@/lib/map/mapMode'
import { parentCommuneInseeForArrondissement } from '@/lib/map/municipalArrondissement'

const APICARTO_COMMUNE = 'https://apicarto.ign.fr/api/cadastre/commune'
const APICARTO_PARCEL = 'https://apicarto.ign.fr/api/cadastre/parcelle'
const GEO_API_COMMUNE = 'https://geo.api.gouv.fr/communes'

/** Propriété OL : emprise mode parcelle / territoire (distincte de l’emprise lieu geopf). */
export const MODE_EMPRISE_PROP = 'ec-mode-emprise'

export type ModeEmpriseKind = 'commune' | 'parcel' | 'arrondissement'

export type SearchEngineLayerHost = {
  getMap: () => Map | null
  layer?: {
    getSource: () => {
      getFeatures: () => Feature[]
      addFeature: (feature: Feature) => void
      removeFeature?: (feature: Feature) => void
      clear?: () => void
    } | null
  }
  popup?: {
    setPosition: (coordinate: number[] | undefined) => void
  }
}

export const searchEngineLayerHostRef = shallowRef<SearchEngineLayerHost | null>(null)

let empriseTargetKey: string | null = null

const EMPRISE_POINT_EPS = 1e-7

type EmprisePointCache = {
  lon: number
  lat: number
  byMode: Partial<Record<MapModeId, Feature[]>>
}

/** Emprises mode déjà chargées au point cerise (évite APICarto au changement de mode). */
let emprisePointCache: EmprisePointCache | null = null

const geoJson = new GeoJSON()

function sameEmprisePoint(
  a: { lon: number; lat: number },
  b: { lon: number; lat: number },
): boolean {
  return (
    Math.abs(a.lon - b.lon) <= EMPRISE_POINT_EPS && Math.abs(a.lat - b.lat) <= EMPRISE_POINT_EPS
  )
}

function syncEmprisePointCache(lon: number, lat: number): void {
  if (!emprisePointCache || !sameEmprisePoint(emprisePointCache, { lon, lat })) {
    emprisePointCache = { lon, lat, byMode: {} }
  }
}

function cloneEmpriseFeature(feature: Feature): Feature {
  const clone = feature.clone() as Feature
  const kind = feature.get(MODE_EMPRISE_PROP) as ModeEmpriseKind | undefined
  if (kind) {
    clone.set(MODE_EMPRISE_PROP, kind)
    clone.setStyle(styleForKind(kind))
  }
  return clone
}

function storeEmpriseInCache(lon: number, lat: number, mode: MapModeId, features: Feature[]): void {
  syncEmprisePointCache(lon, lat)
  emprisePointCache!.byMode[mode] = features.map(cloneEmpriseFeature)
}

function cachedEmpriseForMode(lon: number, lat: number, mode: MapModeId): Feature[] | null {
  if (!emprisePointCache || !sameEmprisePoint(emprisePointCache, { lon, lat })) return null
  if (!Object.prototype.hasOwnProperty.call(emprisePointCache.byMode, mode)) return null
  const stored = emprisePointCache.byMode[mode] ?? []
  return stored.map(cloneEmpriseFeature)
}

function pointGeomParam(lon: number, lat: number): string {
  return encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [lon, lat] }))
}

function modeEmpriseStyle(stroke: string, fill: string): Style {
  return new Style({
    stroke: new Stroke({
      color: stroke,
      width: 2,
      lineDash: [8, 8],
    }),
    fill: new Fill({ color: fill }),
  })
}

/** Emprise commune / parcelle : rouge pointillé. */
export function communeOrParcelEmpriseStyle(): Style {
  return modeEmpriseStyle('rgba(200, 16, 46, 0.95)', 'rgba(200, 16, 46, 0.12)')
}

/** Arrondissement municipal (Paris, Lyon, Marseille) : orange pointillé. */
export function arrondissementEmpriseStyle(): Style {
  return modeEmpriseStyle('rgba(230, 126, 34, 0.95)', 'rgba(230, 126, 34, 0.14)')
}

function styleForKind(kind: ModeEmpriseKind): Style {
  return kind === 'arrondissement' ? arrondissementEmpriseStyle() : communeOrParcelEmpriseStyle()
}

export function dismissSearchEnginePopup(host: SearchEngineLayerHost): void {
  host.popup?.setPosition(undefined)
}

export function hasSearchEmprisePolygon(host: SearchEngineLayerHost): boolean {
  const features = host.layer?.getSource()?.getFeatures() ?? []
  return features.some((f) => {
    const type = f.getGeometry()?.getType()
    return type != null && type !== 'Point' && !f.get(MODE_EMPRISE_PROP)
  })
}

function removeModeEmpriseFeatures(host: SearchEngineLayerHost): void {
  const source = host.layer?.getSource()
  if (!source) return
  for (const feature of [...source.getFeatures()]) {
    if (!feature.get(MODE_EMPRISE_PROP)) continue
    if (typeof source.removeFeature === 'function') {
      source.removeFeature(feature)
    }
  }
}

function readGeoJsonFeature(raw: GeoJsonFeature, kind: ModeEmpriseKind): Feature | null {
  if (!raw?.geometry) return null
  const map = searchEngineLayerHostRef.value?.getMap()
  const projection = map?.getView().getProjection()
  if (!projection) return null
  const feature = geoJson.readFeature(raw, {
    dataProjection: 'EPSG:4326',
    featureProjection: projection,
  }) as Feature
  feature.set(MODE_EMPRISE_PROP, kind)
  feature.setStyle(styleForKind(kind))
  return feature
}

async function fetchCadastreCommuneAtPoint(
  lon: number,
  lat: number,
): Promise<GeoJsonFeature | null> {
  const res = await fetch(`${APICARTO_COMMUNE}?geom=${pointGeomParam(lon, lat)}`)
  if (!res.ok) return null
  const geo = (await res.json()) as FeatureCollection
  return geo.features?.[0] ?? null
}

async function fetchCommuneContourFromGeoApi(codeInsee: string): Promise<GeoJsonFeature | null> {
  const res = await fetch(
    `${GEO_API_COMMUNE}/${encodeURIComponent(codeInsee)}?format=geojson&geometry=contour`,
  )
  if (!res.ok) return null
  const raw = (await res.json()) as GeoJsonFeature
  return raw?.geometry ? raw : null
}

async function fetchParcelFeature(lon: number, lat: number): Promise<Feature | null> {
  const res = await fetch(`${APICARTO_PARCEL}?geom=${pointGeomParam(lon, lat)}`)
  if (!res.ok) return null
  const geo = (await res.json()) as FeatureCollection
  const raw = geo.features?.[0]
  if (!raw?.geometry) return null
  return readGeoJsonFeature(raw, 'parcel')
}

async function fetchTerritoryEmpriseFeatures(lon: number, lat: number): Promise<Feature[]> {
  const atPoint = await fetchCadastreCommuneAtPoint(lon, lat)
  if (!atPoint?.geometry) return []

  const codeInsee = String(atPoint.properties?.code_insee ?? '')
  const parentInsee = parentCommuneInseeForArrondissement(codeInsee)
  const features: Feature[] = []

  if (parentInsee) {
    const parentRaw = await fetchCommuneContourFromGeoApi(parentInsee)
    const commune = parentRaw ? readGeoJsonFeature(parentRaw, 'commune') : null
    if (commune) features.push(commune)
    const arrondissement = readGeoJsonFeature(atPoint, 'arrondissement')
    if (arrondissement) features.push(arrondissement)
    return features
  }

  const commune = readGeoJsonFeature(atPoint, 'commune')
  return commune ? [commune] : []
}

async function fetchModeEmpriseFeatures(
  lon: number,
  lat: number,
  mode: MapModeId,
): Promise<Feature[]> {
  const resolvedMode = normalizeMapMode(mode) ?? MAP_MODE_TERRITORY
  if (resolvedMode === MAP_MODE_PARCEL) {
    const parcel = await fetchParcelFeature(lon, lat)
    return parcel ? [parcel] : []
  }
  if (resolvedMode === MAP_MODE_TERRITORY) {
    return fetchTerritoryEmpriseFeatures(lon, lat)
  }
  return []
}

/**
 * Emprise communale ou parcellaire selon le mode (APICarto), sur la couche SearchEngine.
 * @param targetKey identifiant du clic / recherche courante (ignore les réponses obsolètes).
 */
export async function ensureModeEmpriseOnSearchLayer(
  host: SearchEngineLayerHost,
  lon: number,
  lat: number,
  mode: MapModeId,
  targetKey: string,
): Promise<void> {
  empriseTargetKey = targetKey
  removeModeEmpriseFeatures(host)

  const fromCache = cachedEmpriseForMode(lon, lat, mode)
  if (fromCache !== null && fromCache.length > 0) {
    if (empriseTargetKey !== targetKey) return
    const source = host.layer?.getSource()
    if (!source) return
    for (const feature of fromCache) {
      source.addFeature(feature)
    }
    return
  }

  const features = await fetchModeEmpriseFeatures(lon, lat, mode)
  if (empriseTargetKey !== targetKey) return

  storeEmpriseInCache(lon, lat, mode, features)

  const source = host.layer?.getSource()
  if (!source) return
  for (const feature of features) {
    source.addFeature(feature)
  }
}

/** Point cerise pour recentrage mode (permalink ou dernier chargement emprise). */
export function readCherryOrModeEmprisePoint(): { lon: number; lat: number } | null {
  if (emprisePointCache) {
    return { lon: emprisePointCache.lon, lat: emprisePointCache.lat }
  }
  return null
}

export function empriseTargetKeyForPoint(lon: number, lat: number): string {
  return `${lon.toFixed(6)}|${lat.toFixed(6)}|${Date.now()}`
}

/** Clé stable (changemenent Parcelle / Territoire) — évite les courses avec les clés horodatées. */
export function empriseTargetKeyForModeFocus(lon: number, lat: number): string {
  return `${lon.toFixed(6)}|${lat.toFixed(6)}|mode-emprise`
}

export function ensureModeEmpriseForMapPoint(
  lon: number,
  lat: number,
  mode: MapModeId,
  targetKey: string,
): void {
  const host = searchEngineLayerHostRef.value
  if (!host) return
  void ensureModeEmpriseOnSearchLayer(host, lon, lat, mode, targetKey)
}

/** Emprise rouge pointillée (parcelle / commune / arrondissement) sur la couche SearchEngine. */
export function modeEmpriseViewExtent(host: SearchEngineLayerHost): Extent | null {
  const source = host.layer?.getSource()
  if (!source) return null
  const emprise = createEmpty()
  let hasEmprise = false
  for (const feature of source.getFeatures()) {
    if (!feature.get(MODE_EMPRISE_PROP)) continue
    const geometry = feature.getGeometry()
    if (!geometry || geometry.getType() === 'Point') continue
    extend(emprise, geometry.getExtent())
    hasEmprise = true
  }
  return hasEmprise && !isEmpty(emprise) ? emprise : null
}

/** Met à jour l’emprise mode puis retourne son extent (null si aucune géométrie). */
export async function ensureModeEmpriseForMapPointAsync(
  lon: number,
  lat: number,
  mode: MapModeId,
  targetKey: string,
): Promise<Extent | null> {
  const host = searchEngineLayerHostRef.value
  if (!host) return null
  await ensureModeEmpriseOnSearchLayer(host, lon, lat, mode, targetKey)
  return modeEmpriseViewExtent(host)
}

import { shallowRef } from 'vue'
import Feature from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import { createEmpty, extend, isEmpty } from 'ol/extent'
import type { Extent } from 'ol/extent'
import { Fill, Stroke, Style } from 'ol/style'
import type Map from 'ol/Map'
import type { Feature as GeoJsonFeature } from 'geojson'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import { fetchGpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFetch'
import { modeEmprisePartsFromFichePayload } from '@/lib/map/modeEmpriseFromFiche'
import { whenGpuClientConfigReady } from '@/lib/demo/gpuClientConfigState'

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

/** Emprises mode déjà chargées au point cerise (évite un second appel fiche-info au changement de mode). */
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
  const clone = feature.clone()
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

function readMapZoom(): number {
  const map = searchEngineLayerHostRef.value?.getMap()
  return map?.getView().getZoom() ?? 15
}

function featuresFromFichePayload(
  payload: Parameters<typeof modeEmprisePartsFromFichePayload>[0],
  mode: MapModeId,
): Feature[] {
  const parts = modeEmprisePartsFromFichePayload(payload, mode)
  const features: Feature[] = []
  for (const part of parts) {
    const feature = readGeoJsonFeature(
      { type: 'Feature', geometry: part.geometry, properties: {} },
      part.kind,
    )
    if (feature) features.push(feature)
  }
  return features
}

function cacheBothModeEmprisesFromPayload(
  lon: number,
  lat: number,
  payload: Parameters<typeof modeEmprisePartsFromFichePayload>[0],
): void {
  storeEmpriseInCache(lon, lat, MAP_MODE_PARCEL, featuresFromFichePayload(payload, MAP_MODE_PARCEL))
  storeEmpriseInCache(
    lon,
    lat,
    MAP_MODE_TERRITORY,
    featuresFromFichePayload(payload, MAP_MODE_TERRITORY),
  )
}

async function fetchModeEmpriseFeatures(
  lon: number,
  lat: number,
  mode: MapModeId,
  zoom: number,
): Promise<Feature[]> {
  if (typeof window === 'undefined') return []

  return new Promise((resolve) => {
    whenGpuClientConfigReady(() => {
      void fetchGpuFicheInfoPayload({ lon, lat, zoom, mode }).then((payload) => {
        if (!payload) {
          resolve([])
          return
        }
        cacheBothModeEmprisesFromPayload(lon, lat, payload)
        resolve(featuresFromFichePayload(payload, mode))
      })
    })
  })
}

/**
 * Emprise communale ou parcellaire selon le mode (géométries fiche-info v2), sur la couche SearchEngine.
 * @param targetKey identifiant du clic / recherche courante (ignore les réponses obsolètes).
 */
export async function ensureModeEmpriseOnSearchLayer(
  host: SearchEngineLayerHost,
  lon: number,
  lat: number,
  mode: MapModeId,
  targetKey: string,
  zoom = readMapZoom(),
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

  const features = await fetchModeEmpriseFeatures(lon, lat, mode, zoom)
  if (empriseTargetKey !== targetKey) return

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

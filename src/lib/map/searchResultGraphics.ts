import { shallowRef } from 'vue'
import Feature from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import { Fill, Stroke, Style } from 'ol/style'
import type Map from 'ol/Map'
import type { FeatureCollection } from 'geojson'
import type { StandardViewerSearch } from '@/lib/types'

const APICARTO_COMMUNE = 'https://apicarto.ign.fr/api/cadastre/commune'

export type SearchEngineLayerHost = {
  getMap: () => Map | null
  layer?: {
    getSource: () => {
      getFeatures: () => Feature[]
      addFeature: (feature: Feature) => void
    } | null
  }
  popup?: {
    setPosition: (coordinate: number[] | undefined) => void
  }
}

export const searchEngineLayerHostRef = shallowRef<SearchEngineLayerHost | null>(null)

let empriseTargetKey: string | null = null

function pointGeomParam(lon: number, lat: number): string {
  return encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [lon, lat] }))
}

/** Style emprise geopf (double trait bleu / blanc pointillé). */
export function geopfEmpriseStyle(): Style[] {
  const make = (color: number[], offset = 0) =>
    new Style({
      stroke: new Stroke({
        color,
        width: 2,
        lineDash: [8, 8],
        lineDashOffset: offset,
      }),
      fill: new Fill({ color: 'rgba(0, 0, 0, 0.1)' }),
    })
  return [make([255, 255, 255, 1]), make([0, 0, 145, 1], 8)]
}

export function dismissSearchEnginePopup(host: SearchEngineLayerHost): void {
  host.popup?.setPosition(undefined)
}

export function hasSearchEmprisePolygon(host: SearchEngineLayerHost): boolean {
  const features = host.layer?.getSource()?.getFeatures() ?? []
  return features.some((f) => {
    const type = f.getGeometry()?.getType()
    return type != null && type !== 'Point'
  })
}

async function fetchCommuneFeature(lon: number, lat: number): Promise<Feature | null> {
  const res = await fetch(`${APICARTO_COMMUNE}?geom=${pointGeomParam(lon, lat)}`)
  if (!res.ok) return null
  const geo = (await res.json()) as FeatureCollection
  const raw = geo.features?.[0]
  if (!raw?.geometry) return null
  const map = searchEngineLayerHostRef.value?.getMap()
  const projection = map?.getView().getProjection()
  if (!projection) return null
  const feature = new GeoJSON().readFeature(raw, {
    dataProjection: 'EPSG:4326',
    featureProjection: projection,
  }) as Feature
  feature.set('ec-search-emprise', 'commune')
  feature.setStyle(geopfEmpriseStyle())
  return feature
}

/**
 * Ajoute l’emprise communale (APICarto) si la couche n’a qu’une cerise.
 * @param targetKey identifiant du clic / recherche courante (ignore les réponses obsolètes).
 */
export async function ensureCommuneEmpriseOnSearchLayer(
  host: SearchEngineLayerHost,
  lon: number,
  lat: number,
  targetKey: string,
): Promise<void> {
  empriseTargetKey = targetKey
  if (hasSearchEmprisePolygon(host)) return

  const feature = await fetchCommuneFeature(lon, lat)
  if (!feature || empriseTargetKey !== targetKey) return
  if (hasSearchEmprisePolygon(host)) return

  host.layer?.getSource()?.addFeature(feature)
}

export function empriseTargetKeyForPoint(lon: number, lat: number): string {
  return `${lon.toFixed(6)}|${lat.toFixed(6)}|${Date.now()}`
}

/** Emprise communale de secours : pas si geopf a déjà une emprise ou un résultat précis (adresse, etc.). */
export function shouldDrawCommuneEmpriseFallback(
  search: StandardViewerSearch | null | undefined,
  host: SearchEngineLayerHost,
  searchEvent?: { extent?: Feature },
): boolean {
  if (hasSearchEmprisePolygon(host)) return false
  if (searchEvent?.extent) return false

  const type = String(search?.type ?? '')
  if (type === 'StreetAddress' || type === 'geolocate') return false
  if (search?.kind === 'StreetAddress') return false

  return true
}

export function ensureCommuneEmpriseForMapPoint(lon: number, lat: number, targetKey: string): void {
  const host = searchEngineLayerHostRef.value
  if (!host) return
  void ensureCommuneEmpriseOnSearchLayer(host, lon, lat, targetKey)
}

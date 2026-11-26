import GeoJSON from 'ol/format/GeoJSON'
import type Geometry from 'ol/geom/Geometry'
import MultiPolygon from 'ol/geom/MultiPolygon'
import Polygon from 'ol/geom/Polygon'
import type { ParcelIdParts } from '@/lib/fiche/parcelId'
import { GEOPF_SERVICE_BASE } from '@/lib/search/createSearchEngineAdvanced'

type ParcelSearchFeature = {
  geometry?: { type?: string; coordinates?: number[] }
  properties?: { truegeometry?: unknown }
}

/** Point garanti à l’intérieur de la parcelle (le point « position » du service peut tomber à côté). */
function interiorPoint(geometry: Geometry): [number, number] | null {
  if (geometry instanceof Polygon) {
    const [lon, lat] = geometry.getInteriorPoint().getCoordinates()
    return [lon, lat]
  }
  if (geometry instanceof MultiPolygon) {
    const [lon, lat] = geometry.getInteriorPoints().getCoordinates()[0] ?? []
    return lon != null && lat != null ? [lon, lat] : null
  }
  return null
}

/**
 * Position d’une parcelle par son identifiant cadastral (géocodage IGN, index parcelle).
 * null si la parcelle est introuvable.
 */
export async function locateParcelById(
  parts: ParcelIdParts,
): Promise<{ lon: number; lat: number } | null> {
  const url = new URL(`${GEOPF_SERVICE_BASE}/geocodage/search`)
  url.searchParams.set('index', 'parcel')
  url.searchParams.set('q', '')
  url.searchParams.set('departmentcode', parts.dep)
  url.searchParams.set('municipalitycode', parts.com)
  url.searchParams.set('districtcode', parts.arr)
  url.searchParams.set('oldmunicipalitycode', parts.comAbs)
  url.searchParams.set('section', parts.section)
  url.searchParams.set('number', parts.numero)
  url.searchParams.set('returntruegeometry', 'true')
  url.searchParams.set('limit', '1')

  const response = await fetch(url.toString())
  if (!response.ok) return null
  const data = (await response.json()) as { features?: ParcelSearchFeature[] }
  const feature = data.features?.[0]
  if (!feature) return null

  const trueGeometry = feature.properties?.truegeometry
  if (trueGeometry && typeof trueGeometry === 'object') {
    const geometry = new GeoJSON().readGeometry(trueGeometry)
    const inside = geometry ? interiorPoint(geometry) : null
    if (inside) return { lon: inside[0], lat: inside[1] }
  }
  const [lon, lat] = feature.geometry?.coordinates ?? []
  return typeof lon === 'number' && typeof lat === 'number' ? { lon, lat } : null
}

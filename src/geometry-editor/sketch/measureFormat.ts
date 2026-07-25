import type Map from 'ol/Map'
import { getLength, getArea } from 'ol/sphere'
import type { LineString, Polygon } from 'ol/geom'

/** Longueur géodésique formatée (m / km). */
export function formatMapLength(map: Map, line: LineString): string {
  const proj = map.getView().getProjection()
  const clone = line.clone().transform(proj, 'EPSG:4326') as LineString
  const length = getLength(clone, { projection: 'EPSG:4326' })
  if (length > 1000) return `${Math.round((length / 1000) * 100) / 100} km`
  return `${Math.round(length * 100) / 100} m`
}

/** Aire géodésique formatée (m² / km²). */
export function formatMapArea(map: Map, polygon: Polygon): string {
  const proj = map.getView().getProjection()
  const clone = polygon.clone().transform(proj, 'EPSG:4326') as Polygon
  const area = getArea(clone, { projection: 'EPSG:4326' })
  if (area > 100_000) {
    return `${Math.round((area / 1_000_000) * 100) / 100} km²`
  }
  return `${Math.round(area * 100) / 100} m²`
}

/** Point d’ancrage d’une popup de mesure. */
export function measureAnchor(
  _map: Map,
  geom: LineString | Polygon,
): number[] {
  if (geom.getType() === 'Polygon') {
    return (geom as Polygon).getInteriorPoint().getCoordinates()
  }
  return (geom as LineString).getCoordinateAt(0.5)
}

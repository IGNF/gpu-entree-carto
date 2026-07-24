/**
 * Helpers cercle / disque (ol/geom/Circle).
 * Sérialisation custom GeoJSON-like :
 * `{ "type": "Circle"|"Disc", "center": [lon, lat], "radius": meters }`
 * (radius en mètres projection carte EPSG:3857).
 */
import Feature from 'ol/Feature'
import Circle from 'ol/geom/Circle'
import { fromCircle } from 'ol/geom/Polygon'
import { fromLonLat, toLonLat } from 'ol/proj'
import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import type { Coordinate } from 'ol/coordinate'

export type CircleKind = 'circle' | 'disc'

export const EC_KIND_PROP = 'ecKind'

export function isCircleGeom(geom: OlGeometry | undefined): geom is Circle {
  return geom instanceof Circle
}

export function getCircleKind(feature: OlFeature): CircleKind {
  const k = feature.get(EC_KIND_PROP)
  return k === 'disc' ? 'disc' : 'circle'
}

export function setCircleKind(feature: OlFeature, kind: CircleKind): void {
  feature.set(EC_KIND_PROP, kind)
}

export function looksLikeCircleOrDisc(data: unknown): data is {
  type: 'Circle' | 'Disc'
  center: [number, number]
  radius: number
} {
  if (!data || typeof data !== 'object') return false
  const o = data as Record<string, unknown>
  if (o.type !== 'Circle' && o.type !== 'Disc') return false
  if (!Array.isArray(o.center) || o.center.length < 2) return false
  if (typeof o.radius !== 'number' || !(o.radius > 0)) return false
  return typeof o.center[0] === 'number' && typeof o.center[1] === 'number'
}

export function circleFromLonLatRadius(
  centerLonLat: Coordinate,
  radiusMeters: number,
  mapProjection = 'EPSG:3857',
): Circle {
  const center = fromLonLat(centerLonLat, mapProjection)
  return new Circle(center, radiusMeters)
}

export function featureFromCircleJson(
  data: { type: 'Circle' | 'Disc'; center: [number, number]; radius: number },
  mapProjection = 'EPSG:3857',
): OlFeature<OlGeometry> {
  const circle = circleFromLonLatRadius(data.center, data.radius, mapProjection)
  const feature = new Feature({ geometry: circle })
  setCircleKind(feature, data.type === 'Disc' ? 'disc' : 'circle')
  return feature
}

export function serializeCircleFeature(
  feature: OlFeature<OlGeometry>,
  precision: number,
  mapProjection = 'EPSG:3857',
): string | null {
  const geom = feature.getGeometry()
  if (!(geom instanceof Circle)) return null
  const center3857 = geom.getCenter()
  const [lon, lat] = toLonLat(center3857, mapProjection)
  const kind = getCircleKind(feature)
  const f = 10 ** precision
  const round = (n: number) => Math.round(n * f) / f
  return JSON.stringify({
    type: kind === 'disc' ? 'Disc' : 'Circle',
    center: [round(lon), round(lat)],
    radius: round(geom.getRadius()),
  })
}

/** Pour KML : polygone approximant le cercle. */
export function circleToPolygonFeature(
  feature: OlFeature<OlGeometry>,
): OlFeature<OlGeometry> {
  const geom = feature.getGeometry()
  if (!(geom instanceof Circle)) return feature
  const poly = fromCircle(geom, 64)
  const out = new Feature({ geometry: poly })
  out.setProperties(feature.getProperties())
  return out
}

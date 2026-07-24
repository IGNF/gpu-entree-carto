/**
 * Helpers cercle / disque (ol/geom/Circle).
 * Sérialisation custom GeoJSON-like :
 * `{ "type": "Circle"|"Disc", "center": [lon, lat], "radius": meters }`
 * `{ "type": "MultiCircle"|"MultiDisc", "geometries": [ { center, radius }, ... ] }`
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

export function looksLikeMultiCircleOrDisc(data: unknown): data is {
  type: 'MultiCircle' | 'MultiDisc'
  geometries: Array<{ center: [number, number]; radius: number }>
} {
  if (!data || typeof data !== 'object') return false
  const o = data as Record<string, unknown>
  if (o.type !== 'MultiCircle' && o.type !== 'MultiDisc') return false
  if (!Array.isArray(o.geometries) || !o.geometries.length) return false
  return o.geometries.every(
    (g) =>
      g &&
      typeof g === 'object' &&
      Array.isArray((g as { center?: unknown }).center) &&
      (g as { center: unknown[] }).center.length >= 2 &&
      typeof (g as { center: number[] }).center[0] === 'number' &&
      typeof (g as { center: number[] }).center[1] === 'number' &&
      typeof (g as { radius?: unknown }).radius === 'number' &&
      (g as { radius: number }).radius > 0,
  )
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

export function featuresFromMultiCircleJson(
  data: {
    type: 'MultiCircle' | 'MultiDisc'
    geometries: Array<{ center: [number, number]; radius: number }>
  },
  mapProjection = 'EPSG:3857',
): OlFeature<OlGeometry>[] {
  const kind: CircleKind = data.type === 'MultiDisc' ? 'disc' : 'circle'
  const simpleType = kind === 'disc' ? 'Disc' : 'Circle'
  return data.geometries.map((g) =>
    featureFromCircleJson(
      { type: simpleType, center: g.center, radius: g.radius },
      mapProjection,
    ),
  )
}

function circleParts(
  feature: OlFeature<OlGeometry>,
  precision: number,
  mapProjection: string,
): { center: [number, number]; radius: number } | null {
  const geom = feature.getGeometry()
  if (!(geom instanceof Circle)) return null
  const [lon, lat] = toLonLat(geom.getCenter(), mapProjection)
  const f = 10 ** precision
  const round = (n: number) => Math.round(n * f) / f
  return {
    center: [round(lon), round(lat)],
    radius: round(geom.getRadius()),
  }
}

export function serializeCircleFeature(
  feature: OlFeature<OlGeometry>,
  precision: number,
  mapProjection = 'EPSG:3857',
): string | null {
  const parts = circleParts(feature, precision, mapProjection)
  if (!parts) return null
  const kind = getCircleKind(feature)
  return JSON.stringify({
    type: kind === 'disc' ? 'Disc' : 'Circle',
    center: parts.center,
    radius: parts.radius,
  })
}

export function serializeMultiCircleFeatures(
  features: OlFeature<OlGeometry>[],
  kind: CircleKind,
  precision: number,
  mapProjection = 'EPSG:3857',
): string | null {
  const geometries: Array<{ center: [number, number]; radius: number }> = []
  for (const feature of features) {
    if (!(feature.getGeometry() instanceof Circle)) continue
    if (getCircleKind(feature) !== kind) continue
    const parts = circleParts(feature, precision, mapProjection)
    if (parts) geometries.push(parts)
  }
  if (!geometries.length) return null
  return JSON.stringify({
    type: kind === 'disc' ? 'MultiDisc' : 'MultiCircle',
    geometries,
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

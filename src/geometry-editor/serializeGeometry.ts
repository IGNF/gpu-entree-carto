import Feature from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import KML from 'ol/format/KML'
import type { Feature as OlFeature } from 'ol'
import Circle from 'ol/geom/Circle'
import {
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
  type Geometry as OlGeometry,
} from 'ol/geom'
import type { GeometryOutputFormat, GeometryTypeOption } from './types'
import {
  circleToPolygonFeature,
  serializeCircleFeature,
} from './circleHelpers'

const geoJsonFormat = new GeoJSON()
const kmlFormat = new KML()

function roundCoords(value: unknown, precision: number): unknown {
  if (typeof value === 'number') {
    const f = 10 ** precision
    return Math.round(value * f) / f
  }
  if (Array.isArray(value)) {
    return value.map((v) => roundCoords(v, precision))
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = roundCoords(v, precision)
    }
    return out
  }
  return value
}

/**
 * Sérialise les features carte → chaîne pour l’élément HTML.
 * - Rectangle → bbox JSON `[minX,minY,maxX,maxY]` (compat ol-geometry-editor)
 * - Circle / Disc → `{ type, center: [lon,lat], radius }` (radius en m EPSG:3857)
 * - sinon GeoJSON geometry (ou FeatureCollection si plusieurs) / KML
 */
export function serializeFeatures(
  features: OlFeature<OlGeometry>[],
  options: {
    geometryType: GeometryTypeOption
    precision: number
    outputFormat: GeometryOutputFormat
    mapProjection?: string
  },
): string {
  const {
    geometryType,
    precision,
    outputFormat,
    mapProjection = 'EPSG:3857',
  } = options

  if (!features.length) return ''

  if (outputFormat === 'kml') {
    const forKml = features.map((f) =>
      f.getGeometry() instanceof Circle ? circleToPolygonFeature(f) : f,
    )
    return kmlFormat.writeFeatures(forKml, {
      dataProjection: 'EPSG:4326',
      featureProjection: mapProjection,
    })
  }

  if (geometryType === 'Rectangle' && features.length === 1) {
    const geom = features[0].getGeometry()
    if (geom) {
      const clone = geom.clone()
      clone.transform(mapProjection, 'EPSG:4326')
      const e = clone.getExtent()
      return JSON.stringify(roundCoords([...e], precision))
    }
  }

  if (
    (geometryType === 'Circle' || geometryType === 'Disc') &&
    features.length === 1
  ) {
    const s = serializeCircleFeature(features[0], precision, mapProjection)
    if (s) return s
  }

  // Une seule feature Circle/Disc (ex. mode Geometry)
  if (features.length === 1 && features[0].getGeometry() instanceof Circle) {
    const s = serializeCircleFeature(features[0], precision, mapProjection)
    if (s) return s
  }

  // Multi* : regroupe les géométries simples en une Multi* GeoJSON
  // Les cercles / disques → polygones (GeoJSON standard)
  const prepared = features.map((f) =>
    f.getGeometry() instanceof Circle ? circleToPolygonFeature(f) : f,
  )
  const multiMerged = mergeToMultiFeature(prepared, geometryType)
  const toWrite = multiMerged ? [multiMerged] : prepared

  const json = geoJsonFormat.writeFeaturesObject(toWrite, {
    dataProjection: 'EPSG:4326',
    featureProjection: mapProjection,
  })

  const rounded = roundCoords(json, precision) as {
    type: string
    features: Array<{ geometry: unknown }>
  }

  if (rounded.features.length === 1) {
    return JSON.stringify(rounded.features[0].geometry)
  }
  return JSON.stringify(rounded)
}

function mergeToMultiFeature(
  features: OlFeature<OlGeometry>[],
  geometryType: GeometryTypeOption,
): OlFeature<OlGeometry> | null {
  if (geometryType === 'MultiPoint') {
    const points = features
      .map((f) => f.getGeometry())
      .filter((g): g is Point => g instanceof Point)
    if (!points.length) return null
    return new Feature({
      geometry: new MultiPoint(points.map((p) => p.getCoordinates())),
    })
  }
  if (geometryType === 'MultiLineString') {
    const lines = features
      .map((f) => f.getGeometry())
      .filter((g): g is LineString => g instanceof LineString)
    if (!lines.length) return null
    return new Feature({
      geometry: new MultiLineString(lines.map((l) => l.getCoordinates())),
    })
  }
  if (geometryType === 'MultiPolygon') {
    const polys = features
      .map((f) => f.getGeometry())
      .filter((g): g is Polygon => g instanceof Polygon)
    if (!polys.length) return null
    return new Feature({
      geometry: new MultiPolygon(polys.map((p) => p.getCoordinates())),
    })
  }
  return null
}

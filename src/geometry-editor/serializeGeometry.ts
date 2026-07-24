import Feature from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import KML from 'ol/format/KML'
import type { Feature as OlFeature } from 'ol'
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
    return kmlFormat.writeFeatures(features, {
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

  // Multi* : regroupe les géométries simples en une Multi* GeoJSON
  const multiMerged = mergeToMultiFeature(features, geometryType)
  const toWrite = multiMerged ? [multiMerged] : features

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

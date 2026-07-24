import Feature from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import KML from 'ol/format/KML'
import {
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Polygon,
  type Geometry as OlGeometry,
} from 'ol/geom'
import type { Feature as OlFeature } from 'ol'

const geoJsonFormat = new GeoJSON()
const kmlFormat = new KML({ extractStyles: false })

export function looksLikeKml(raw: string): boolean {
  const t = raw.trim()
  return t.startsWith('<') && /<\/?kml[\s>]/i.test(t)
}

export function looksLikeBbox(raw: string): boolean {
  try {
    const v = JSON.parse(raw) as unknown
    return (
      Array.isArray(v) &&
      v.length === 4 &&
      v.every((n) => typeof n === 'number')
    )
  } catch {
    return false
  }
}

/** Bbox [minX, minY, maxX, maxY] → Polygon EPSG:4326. */
export function bboxToPolygon(bbox: number[]): Polygon {
  const [minX, minY, maxX, maxY] = bbox
  return new Polygon([
    [
      [minX, minY],
      [minX, maxY],
      [maxX, maxY],
      [maxX, minY],
      [minX, minY],
    ],
  ])
}

/**
 * Éclate Multi* en géométries simples (édition / suppression unitaire).
 */
export function explodeMultiFeatures(
  features: OlFeature<OlGeometry>[],
): OlFeature<OlGeometry>[] {
  const out: OlFeature<OlGeometry>[] = []
  for (const feature of features) {
    const geom = feature.getGeometry()
    if (!geom) continue
    if (geom instanceof MultiPoint) {
      for (const point of geom.getPoints()) {
        out.push(new Feature({ geometry: point }))
      }
    } else if (geom instanceof MultiLineString) {
      for (const line of geom.getLineStrings()) {
        out.push(new Feature({ geometry: line }))
      }
    } else if (geom instanceof MultiPolygon) {
      for (const poly of geom.getPolygons()) {
        out.push(new Feature({ geometry: poly }))
      }
    } else {
      out.push(feature)
    }
  }
  return out
}

/**
 * Lit le contenu d’un élément (GeoJSON geometry/Feature/FeatureCollection, KML, bbox).
 * Retourne des features en projection carte (EPSG:3857).
 * Les Multi* sont éclatés en géométries simples pour l’édition.
 */
export function parseRawToFeatures(
  raw: string,
  mapProjection = 'EPSG:3857',
): OlFeature<OlGeometry>[] {
  const text = raw.trim()
  if (!text) return []

  let features: OlFeature<OlGeometry>[] = []

  if (looksLikeKml(text)) {
    features = kmlFormat.readFeatures(text, {
      dataProjection: 'EPSG:4326',
      featureProjection: mapProjection,
    }) as OlFeature<OlGeometry>[]
  } else if (looksLikeBbox(text)) {
    const bbox = JSON.parse(text) as number[]
    const poly = bboxToPolygon(bbox)
    poly.transform('EPSG:4326', mapProjection)
    features = [new Feature({ geometry: poly })]
  } else {
    try {
      const data = JSON.parse(text) as { type?: string }
      if (data?.type === 'FeatureCollection' || data?.type === 'Feature') {
        features = geoJsonFormat.readFeatures(data, {
          dataProjection: 'EPSG:4326',
          featureProjection: mapProjection,
        }) as OlFeature<OlGeometry>[]
      } else {
        features = geoJsonFormat.readFeatures(
          { type: 'Feature', geometry: data, properties: {} },
          {
            dataProjection: 'EPSG:4326',
            featureProjection: mapProjection,
          },
        ) as OlFeature<OlGeometry>[]
      }
    } catch {
      console.error('[entree-carto-geometry-editor] parse failed')
      return []
    }
  }

  return explodeMultiFeatures(features)
}

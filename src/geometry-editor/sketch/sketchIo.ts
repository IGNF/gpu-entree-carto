import type Map from 'ol/Map'
import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import type VectorSource from 'ol/source/Vector'
import Circle from 'ol/geom/Circle'
import GeoJSON from 'ol/format/GeoJSON'
import KML from 'ol/format/KML'
import { FEATURE_STYLE_PROP, restoreFeaturesStyles } from './featureStyle'
import { adaptGpuClientSketchFeatures } from './gpuClientSketchAdapter'
import { SKETCH_TEXT_PROP } from './SketchTextPopup'
import {
  EC_KIND_PROP,
  circleToPolygonFeature,
  featureFromCircleJson,
  featuresFromMultiCircleJson,
  looksLikeCircleOrDisc,
  looksLikeMultiCircleOrDisc,
  polygonApproxToCircleFeature,
  serializeCircleFeature,
  type CircleKind,
} from '../circleHelpers'

const GEOJSON = new GeoJSON()
const KML_FMT = new KML({ extractStyles: true, writeStyles: true })
const SKETCH_PRECISION = 7

export type SketchIoFormat = 'geojson' | 'kml'

const STYLE_PROP_KEYS = [FEATURE_STYLE_PROP, SKETCH_TEXT_PROP] as const

function projectionOf(map: Map) {
  return map.getView().getProjection()
}

function mapProjectionCode(map: Map): string {
  const p = projectionOf(map)
  return typeof p === 'string' ? p : p.getCode()
}

/** KML ExtendedData ne garde bien que des chaînes → JSON.stringify des props style. */
function cloneForKmlExport(features: OlFeature<OlGeometry>[]): OlFeature<OlGeometry>[] {
  return features.map((f) => {
    const c = f.clone()
    for (const key of STYLE_PROP_KEYS) {
      const v = c.get(key)
      if (v && typeof v === 'object') {
        c.set(key, JSON.stringify(v))
      }
    }
    return c
  })
}

/** Après lecture : parse JSON des props style + réapplique Style OL. */
export function hydrateImportedSketchFeatures(features: OlFeature<OlGeometry>[]): void {
  for (const f of features) {
    for (const key of STYLE_PROP_KEYS) {
      const v = f.get(key)
      if (typeof v === 'string') {
        try {
          f.set(key, JSON.parse(v))
        } catch {
          /* ignore */
        }
      }
    }
  }
  restoreFeaturesStyles(features)
}

/** Restaure Circle/Disc après KML (polygones) ou GeoJSON legacy. */
function restoreImportedCircleFeatures(features: OlFeature<OlGeometry>[]): OlFeature<OlGeometry>[] {
  return features.map((f) => {
    const g = f.getGeometry()
    if (g instanceof Circle) return f
    const kind = f.get(EC_KIND_PROP) as CircleKind | undefined
    if (kind === 'disc' || kind === 'circle') {
      return polygonApproxToCircleFeature(f, kind)
    }
    return f
  })
}

type GeoJsonFeatureLike = {
  type?: string
  geometry?: unknown
  properties?: Record<string, unknown>
}

function copyFeatureProperties(
  feature: OlFeature<OlGeometry>,
  props: Record<string, unknown> | undefined,
): void {
  if (!props) return
  for (const [key, value] of Object.entries(props)) {
    if (key === 'geometry') continue
    feature.set(key, value)
  }
}

function readSketchGeoJsonFeature(
  raw: GeoJsonFeatureLike,
  mapProjection: string,
): OlFeature<OlGeometry>[] {
  const geom = raw.geometry
  if (looksLikeCircleOrDisc(geom)) {
    const feature = featureFromCircleJson(geom, mapProjection)
    copyFeatureProperties(feature, raw.properties)
    return [feature]
  }
  if (looksLikeMultiCircleOrDisc(geom)) {
    const features = featuresFromMultiCircleJson(geom, mapProjection)
    const props = raw.properties
    if (props) {
      for (const f of features) copyFeatureProperties(f, props)
    }
    return features
  }
  return GEOJSON.readFeatures(raw, {
    dataProjection: 'EPSG:4326',
    featureProjection: mapProjection,
  }) as OlFeature<OlGeometry>[]
}

/** Lit un objet GeoJSON croquis (FeatureCollection ou géométrie seule). */
export function readSketchGeoJsonObject(map: Map, data: unknown): OlFeature<OlGeometry>[] {
  const mapProjection = mapProjectionCode(map)
  if (!data || typeof data !== 'object') return []

  const root = data as { type?: string; features?: GeoJsonFeatureLike[] }
  let features: OlFeature<OlGeometry>[]

  if (looksLikeMultiCircleOrDisc(data)) {
    features = featuresFromMultiCircleJson(data, mapProjection)
  } else if (looksLikeCircleOrDisc(data)) {
    features = [featureFromCircleJson(data, mapProjection)]
  } else if (root.type === 'FeatureCollection' && Array.isArray(root.features)) {
    features = root.features.flatMap((f) => readSketchGeoJsonFeature(f, mapProjection))
  } else if (root.type === 'Feature') {
    features = readSketchGeoJsonFeature(root, mapProjection)
  } else {
    features = GEOJSON.readFeatures(
      { type: 'Feature', geometry: data, properties: {} },
      { dataProjection: 'EPSG:4326', featureProjection: mapProjection },
    ) as OlFeature<OlGeometry>[]
  }

  features = restoreImportedCircleFeatures(features)
  adaptGpuClientSketchFeatures(features)
  hydrateImportedSketchFeatures(features)
  return features
}

/** Sérialise les features croquis en FeatureCollection GeoJSON (Circle/Disc custom). */
export function writeSketchGeoJsonObject(
  map: Map,
  features: OlFeature<OlGeometry>[],
): { type: 'FeatureCollection'; features: unknown[] } {
  const mapProjection = mapProjectionCode(map)
  const opts = {
    featureProjection: projectionOf(map),
    dataProjection: 'EPSG:4326',
  }
  const out = features.map((f) => {
    if (f.getGeometry() instanceof Circle) {
      const geomJson = JSON.parse(
        serializeCircleFeature(f, SKETCH_PRECISION, mapProjection)!,
      ) as object
      const props = { ...f.getProperties() }
      delete props.geometry
      return { type: 'Feature', geometry: geomJson, properties: props }
    }
    return GEOJSON.writeFeatureObject(f, opts)
  })
  return { type: 'FeatureCollection', features: out }
}

/** Snapshot texte (localStorage, historique). */
export function sketchFeaturesSnapshot(map: Map, features: OlFeature<OlGeometry>[]): string {
  return JSON.stringify(writeSketchGeoJsonObject(map, features))
}

/** Restaure un snapshot croquis. */
export function sketchFeaturesFromSnapshot(map: Map, raw: string): OlFeature<OlGeometry>[] {
  try {
    return readSketchGeoJsonObject(map, JSON.parse(raw))
  } catch {
    return []
  }
}

/** Lit un fichier GeoJSON ou KML → features (projection carte) + styles properties. */
export function readSketchFile(
  map: Map,
  text: string,
  format: SketchIoFormat,
): OlFeature<OlGeometry>[] {
  if (format === 'kml') {
    const features = KML_FMT.readFeatures(text, {
      featureProjection: projectionOf(map),
      dataProjection: 'EPSG:4326',
    }) as OlFeature<OlGeometry>[]
    const restored = restoreImportedCircleFeatures(features)
    adaptGpuClientSketchFeatures(restored)
    hydrateImportedSketchFeatures(restored)
    return restored
  }
  return readSketchGeoJsonObject(map, JSON.parse(text))
}

/** Sérialise les features croquis en GeoJSON ou KML (inclut styles + Circle/Disc). */
export function writeSketchFile(map: Map, source: VectorSource, format: SketchIoFormat): string {
  const features = source.getFeatures() as OlFeature<OlGeometry>[]
  const opts = {
    featureProjection: projectionOf(map),
    dataProjection: 'EPSG:4326',
  }
  if (format === 'kml') {
    const forKml = features.map((f) =>
      f.getGeometry() instanceof Circle ? circleToPolygonFeature(f) : f,
    )
    return KML_FMT.writeFeatures(cloneForKmlExport(forKml), opts)
  }
  return JSON.stringify(writeSketchGeoJsonObject(map, features), null, 2)
}

export function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function pickSketchFile(accept: string, onFile: (text: string, name: string) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  input.style.display = 'none'
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    input.remove()
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onFile(reader.result, file.name)
    }
    reader.readAsText(file)
  })
  document.body.appendChild(input)
  input.click()
}

export function formatFromFilename(name: string): SketchIoFormat {
  return /\.kml$/i.test(name) ? 'kml' : 'geojson'
}

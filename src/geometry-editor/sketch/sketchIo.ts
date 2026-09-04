import type Map from 'ol/Map'
import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import type VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import KML from 'ol/format/KML'
import { FEATURE_STYLE_PROP, restoreFeaturesStyles } from './featureStyle'
import { SKETCH_TEXT_PROP } from './SketchTextPopup'

const GEOJSON = new GeoJSON()
const KML_FMT = new KML({ extractStyles: true, writeStyles: true })

export type SketchIoFormat = 'geojson' | 'kml'

const STYLE_PROP_KEYS = [FEATURE_STYLE_PROP, SKETCH_TEXT_PROP] as const

function projectionOf(map: Map) {
  return map.getView().getProjection()
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

/** Lit un fichier GeoJSON ou KML → features (projection carte) + styles properties. */
export function readSketchFile(
  map: Map,
  text: string,
  format: SketchIoFormat,
): OlFeature<OlGeometry>[] {
  const opts = {
    featureProjection: projectionOf(map),
    dataProjection: 'EPSG:4326',
  }
  const features =
    format === 'kml'
      ? (KML_FMT.readFeatures(text, opts) as OlFeature<OlGeometry>[])
      : (GEOJSON.readFeatures(JSON.parse(text), opts) as OlFeature<OlGeometry>[])
  hydrateImportedSketchFeatures(features)
  return features
}

/** Sérialise les features croquis en GeoJSON ou KML (inclut `ec-feature-style`). */
export function writeSketchFile(map: Map, source: VectorSource, format: SketchIoFormat): string {
  const features = source.getFeatures()
  const opts = {
    featureProjection: projectionOf(map),
    dataProjection: 'EPSG:4326',
  }
  if (format === 'kml') {
    return KML_FMT.writeFeatures(cloneForKmlExport(features), opts)
  }
  return JSON.stringify(GEOJSON.writeFeaturesObject(features, opts), null, 2)
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

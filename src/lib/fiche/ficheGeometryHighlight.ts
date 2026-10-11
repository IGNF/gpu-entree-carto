import GeoJSON from 'ol/format/GeoJSON'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Style from 'ol/style/Style'
import Stroke from 'ol/style/Stroke'
import Fill from 'ol/style/Fill'
import type OlMap from 'ol/Map'
import type { FeatureCollection, Geometry } from 'geojson'

const LAYER_KEY = 'ecFicheGeometryHighlight'

const highlightStyle = new Style({
  stroke: new Stroke({ color: 'rgba(0, 0, 145, 0.9)', width: 2 }),
  fill: new Fill({ color: 'rgba(0, 0, 145, 0.12)' }),
})

function readGeometry(value: unknown): Geometry | null {
  if (!value || typeof value !== 'object') return null
  const g = value as Geometry
  if (typeof g.type === 'string') return g
  return null
}

function readFeatureCollection(value: unknown): FeatureCollection | null {
  if (!value || typeof value !== 'object') return null
  const fc = value as FeatureCollection
  if (fc.type === 'FeatureCollection' && Array.isArray(fc.features)) return fc
  return null
}

export function extractFicheHighlightGeometry(raw: Record<string, unknown> | null | undefined): {
  geometry: Geometry | FeatureCollection | null
} {
  if (!raw) return { geometry: null }
  const parcelGeom = readGeometry(raw.parcelGeometry) ?? readGeometry(raw.parcelGeom)
  if (parcelGeom) return { geometry: parcelGeom }
  const gridGeom = readGeometry(raw.gridGeometry) ?? readGeometry(raw.territoryGeometry)
  if (gridGeom) return { geometry: gridGeom }
  const fc =
    readFeatureCollection(raw.parcelFeatureCollection) ??
    readFeatureCollection(raw.gridFeatureCollection)
  if (fc) return { geometry: fc }
  const parcel = raw.parcel
  if (parcel && typeof parcel === 'object') {
    const p = parcel as Record<string, unknown>
    const fromParcel = readGeometry(p.geometry) ?? readFeatureCollection(p.features)
    if (fromParcel) return { geometry: fromParcel }
  }
  return { geometry: null }
}

function findHighlightLayer(map: OlMap): VectorLayer<VectorSource> | null {
  for (const layer of map.getLayers().getArray()) {
    if (layer.get(LAYER_KEY) === true) {
      return layer as VectorLayer<VectorSource>
    }
  }
  return null
}

export function syncFicheGeometryHighlight(
  map: OlMap | null,
  raw: Record<string, unknown> | null | undefined,
): void {
  if (!map) return
  const { geometry } = extractFicheHighlightGeometry(raw)
  let layer = findHighlightLayer(map)
  if (!geometry) {
    if (layer) {
      map.removeLayer(layer)
    }
    return
  }

  const format = new GeoJSON()
  const features = format.readFeatures(
    geometry.type === 'FeatureCollection'
      ? geometry
      : { type: 'Feature', geometry, properties: {} },
    { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' },
  )

  if (!layer) {
    layer = new VectorLayer({
      source: new VectorSource({ features }),
      style: highlightStyle,
      zIndex: 350,
    })
    layer.set(LAYER_KEY, true)
    map.addLayer(layer)
    return
  }

  const source = layer.getSource()
  source?.clear()
  source?.addFeatures(features)
}

export function clearFicheGeometryHighlight(map: OlMap | null): void {
  if (!map) return
  const layer = findHighlightLayer(map)
  if (layer) map.removeLayer(layer)
}

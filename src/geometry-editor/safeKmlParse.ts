/**
 * KML utilisateur : validation stricte + lecture via fast-xml-parser (pas de DOMParser / HTML).
 */
import Feature from 'ol/Feature'
import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import { LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from 'ol/geom'
import type { Coordinate } from 'ol/coordinate'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

/** Motifs interdits dans du XML KML issu d’un champ utilisateur (XSS / HTML embarqué). */
const UNSAFE_TAG = /<\s*(script|iframe|object|embed|foreignObject|link|meta|svg)\b/i
const EVENT_HANDLER = /\son[a-z]+\s*=/i
const JAVASCRIPT_URI = /javascript\s*:/i

const DISALLOWED_LOCAL = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'foreignobject',
  'link',
  'meta',
  'svg',
])

const KML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: false,
  allowBooleanAttributes: false,
  htmlEntities: false,
  trimValues: true,
  parseTagValue: false,
})

export interface ReadUserKmlOptions {
  dataProjection?: string
  featureProjection?: string
}

/**
 * Rejette les contenus manifestement dangereux avant parsing XML.
 * @throws Error si le texte contient du markup actif.
 */
export function assertSafeKmlXmlText(text: string): void {
  if (UNSAFE_TAG.test(text) || EVENT_HANDLER.test(text) || JAVASCRIPT_URI.test(text)) {
    throw new Error('[entree-carto-geometry-editor] unsafe KML markup rejected')
  }
}

/** Détection stricte : racine KML attendue, pas tout XML/HTML commençant par `<`. */
export function looksLikeKmlDocument(raw: string): boolean {
  const t = raw.trim()
  if (!t.startsWith('<')) return false
  if (UNSAFE_TAG.test(t) || EVENT_HANDLER.test(t) || JAVASCRIPT_URI.test(t)) return false
  return /^<\?xml[\s\S]*?>\s*<kml[\s>/]/i.test(t) || /^<kml[\s>/]/i.test(t)
}

function assertSafeKmlParsedTree(value: unknown): void {
  if (value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) assertSafeKmlParsedTree(item)
    return
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key.startsWith('@_') || key === '#text') continue
    const local = key.includes(':') ? key.split(':').pop()! : key
    if (DISALLOWED_LOCAL.has(local.toLowerCase())) {
      throw new Error('[entree-carto-geometry-editor] unsafe KML markup rejected')
    }
    assertSafeKmlParsedTree(child)
  }
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (value === undefined || value === null) return []
  const list = Array.isArray(value) ? value : [value]
  return list.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
}

function kmlText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (typeof value === 'object' && '#text' in (value as object)) {
    return String((value as Record<string, unknown>)['#text']).trim()
  }
  return String(value).trim()
}

function parseKmlCoordinates(raw: string): Coordinate[] {
  const coords: Coordinate[] = []
  for (const token of raw.split(/\s+/)) {
    const t = token.trim()
    if (!t) continue
    const parts = t.split(',').map((p) => Number.parseFloat(p.trim()))
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      coords.push([parts[0], parts[1]])
    }
  }
  return coords
}

function pointFromKml(node: Record<string, unknown>): Point {
  const coords = parseKmlCoordinates(kmlText(node.coordinates))
  if (!coords.length) throw new Error('[entree-carto-geometry-editor] invalid KML Point')
  return new Point(coords[0])
}

function lineFromKml(node: Record<string, unknown>): LineString {
  const coords = parseKmlCoordinates(kmlText(node.coordinates))
  if (coords.length < 2) throw new Error('[entree-carto-geometry-editor] invalid KML LineString')
  return new LineString(coords)
}

function polygonFromKml(node: Record<string, unknown>): Polygon {
  const outer = asRecordArray(node.outerBoundaryIs)[0]
  const ring = asRecordArray(outer?.LinearRing)[0]
  const coords = parseKmlCoordinates(kmlText(ring?.coordinates))
  if (coords.length < 3) throw new Error('[entree-carto-geometry-editor] invalid KML Polygon')
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push(first.slice() as Coordinate)
  }
  const rings = [coords]
  for (const inner of asRecordArray(node.innerBoundaryIs)) {
    const innerRing = asRecordArray(inner.LinearRing)[0]
    const hole = parseKmlCoordinates(kmlText(innerRing?.coordinates))
    if (hole.length >= 3) rings.push(hole)
  }
  return new Polygon(rings)
}

function geometryFromKmlNode(node: Record<string, unknown>): OlGeometry | null {
  const point = asRecordArray(node.Point)[0]
  if (point) return pointFromKml(point)
  const line = asRecordArray(node.LineString)[0]
  if (line) return lineFromKml(line)
  const poly = asRecordArray(node.Polygon)[0]
  if (poly) return polygonFromKml(poly)
  const multi = asRecordArray(node.MultiGeometry)[0]
  if (multi) return multiGeometryFromKml(multi)
  return null
}

function multiGeometryFromKml(node: Record<string, unknown>): OlGeometry {
  const points: Point[] = []
  const lines: LineString[] = []
  const polygons: Polygon[] = []
  for (const p of asRecordArray(node.Point)) {
    points.push(pointFromKml(p))
  }
  for (const l of asRecordArray(node.LineString)) {
    lines.push(lineFromKml(l))
  }
  for (const pg of asRecordArray(node.Polygon)) {
    polygons.push(polygonFromKml(pg))
  }
  for (const nested of asRecordArray(node.MultiGeometry)) {
    const g = multiGeometryFromKml(nested)
    if (g instanceof Point) points.push(g)
    else if (g instanceof LineString) lines.push(g)
    else if (g instanceof Polygon) polygons.push(g)
    else if (g instanceof MultiPoint) points.push(...(g.getPoints() as Point[]))
    else if (g instanceof MultiLineString) lines.push(...g.getLineStrings())
    else if (g instanceof MultiPolygon) polygons.push(...g.getPolygons())
  }
  const total = points.length + lines.length + polygons.length
  if (total === 0) throw new Error('[entree-carto-geometry-editor] empty MultiGeometry')
  if (total === 1) {
    if (points.length) return points[0]
    if (lines.length) return lines[0]
    return polygons[0]
  }
  if (points.length && !lines.length && !polygons.length) {
    return new MultiPoint(points.map((p) => p.getCoordinates()))
  }
  if (lines.length && !points.length && !polygons.length) {
    return new MultiLineString(lines.map((l) => l.getCoordinates()))
  }
  if (polygons.length && !points.length && !lines.length) {
    return new MultiPolygon(polygons.map((p) => p.getCoordinates()))
  }
  throw new Error('[entree-carto-geometry-editor] mixed MultiGeometry not supported')
}

function propertiesFromPlacemark(pm: Record<string, unknown>): Record<string, unknown> {
  const props: Record<string, unknown> = {}
  for (const ext of asRecordArray(pm.ExtendedData)) {
    for (const data of asRecordArray(ext.Data)) {
      const name = data['@_name']
      if (typeof name === 'string') props[name] = kmlText(data.value)
    }
    for (const sd of asRecordArray(ext.SimpleData)) {
      const name = sd['@_name']
      if (typeof name === 'string') props[name] = kmlText(sd)
    }
  }
  const name = kmlText(pm.name)
  if (name) props.name = name
  return props
}

function collectPlacemarks(node: unknown, out: Record<string, unknown>[]): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) collectPlacemarks(item, out)
    return
  }
  const rec = node as Record<string, unknown>
  for (const pm of asRecordArray(rec.Placemark)) {
    out.push(pm)
  }
  for (const [key, val] of Object.entries(rec)) {
    if (key === 'Placemark' || key.startsWith('@_')) continue
    collectPlacemarks(val, out)
  }
}

/**
 * Lit un KML utilisateur en features OpenLayers sans DOMParser (pas de interprétation HTML).
 */
export function readUserKmlFeatures(
  text: string,
  options: ReadUserKmlOptions = {},
): OlFeature<OlGeometry>[] {
  assertSafeKmlXmlText(text)
  if (!looksLikeKmlDocument(text)) {
    throw new Error('[entree-carto-geometry-editor] KML root element required')
  }
  const validation = XMLValidator.validate(text)
  if (validation !== true) {
    throw new Error('[entree-carto-geometry-editor] invalid KML XML')
  }

  const tree = KML_PARSER.parse(text) as Record<string, unknown>
  assertSafeKmlParsedTree(tree)
  const kmlRoot = tree.kml as Record<string, unknown> | undefined
  if (!kmlRoot) {
    throw new Error('[entree-carto-geometry-editor] KML root element required')
  }

  const placemarks: Record<string, unknown>[] = []
  collectPlacemarks(kmlRoot, placemarks)

  const dataProjection = options.dataProjection ?? 'EPSG:4326'
  const featureProjection = options.featureProjection ?? dataProjection
  const features: OlFeature<OlGeometry>[] = []

  for (const pm of placemarks) {
    let geom: OlGeometry | null
    try {
      geom = geometryFromKmlNode(pm)
    } catch {
      continue
    }
    if (!geom) continue
    geom.transform(dataProjection, featureProjection)
    const feature = new Feature({ geometry: geom }) as OlFeature<OlGeometry>
    for (const [key, value] of Object.entries(propertiesFromPlacemark(pm))) {
      feature.set(key, value)
    }
    features.push(feature)
  }

  return features
}

/**
 * Styles par feature croquis (popup d’édition).
 * Propriété `ec-feature-style` (+ setStyle OL) — sérialisée dans GeoJSON/KML properties.
 */
import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import Circle from 'ol/geom/Circle'
import { Point, LineString, MultiLineString, Polygon, MultiPolygon, MultiPoint } from 'ol/geom'
import type { Coordinate } from 'ol/coordinate'
import Style from 'ol/style/Style'
import Fill from 'ol/style/Fill'
import Stroke from 'ol/style/Stroke'
import CircleStyle from 'ol/style/Circle'
import RegularShape from 'ol/style/RegularShape'
import Text from 'ol/style/Text'
import { getCircleKind } from '../circleHelpers'
import {
  SKETCH_TEXT_PROP,
  isSketchTextFeature,
  type SketchTextAttrs,
  clampRotationDeg,
} from './SketchTextPopup'

export const FEATURE_STYLE_PROP = 'ec-feature-style'

export type FeatureStyleKind = 'text' | 'point' | 'line' | 'polygon' | 'circle' | 'disc'

export type StrokeLineCap = 'butt' | 'round' | 'square'
export type StrokeLineJoin = 'bevel' | 'round' | 'miter'
export type PointShape = 'circle' | 'square' | 'triangle' | 'star'

export interface FeatureStyleAttrs {
  kind: FeatureStyleKind
  strokeColor: string
  strokeWidth: number
  fillColor: string
  radius: number
  text: string
  fontSize: number
  fontColor: string
  textStrokeColor: string
  textStrokeWidth: number
  rotation: number
  // — avancés —
  lineDash: number
  lineCap: StrokeLineCap
  lineJoin: StrokeLineJoin
  lineDashOffset: number
  miterLimit: number
  fontFamily: string
  /** Gras */
  fontBold: boolean
  /** Italique */
  fontItalic: boolean
  pointShape: PointShape
  pointRotation: number
  zIndex: number
}

const DEFAULTS: FeatureStyleAttrs = {
  kind: 'polygon',
  strokeColor: '#000091',
  strokeWidth: 2,
  fillColor: 'rgba(0, 0, 145, 0.2)',
  radius: 6,
  text: 'Texte',
  fontSize: 14,
  fontColor: '#000091',
  textStrokeColor: '#ffffff',
  textStrokeWidth: 3,
  rotation: 0,
  lineDash: 0,
  lineCap: 'round',
  lineJoin: 'round',
  lineDashOffset: 0,
  miterLimit: 10,
  fontFamily: 'Marianne, Calibri, sans-serif',
  fontBold: false,
  fontItalic: false,
  pointShape: 'circle',
  pointRotation: 0,
  zIndex: 0,
}

export function defaultFeatureStyleAttrs(kind: FeatureStyleKind): FeatureStyleAttrs {
  const base = { ...DEFAULTS, kind }
  if (kind === 'circle') {
    return { ...base, fillColor: 'rgba(0, 0, 0, 0)' }
  }
  if (kind === 'point') {
    return { ...base, fillColor: '#000091', strokeColor: '#ffffff' }
  }
  if (kind === 'text') {
    return {
      ...base,
      strokeColor: '#ffffff',
      strokeWidth: 0,
      fillColor: 'rgba(0, 0, 0, 0)',
    }
  }
  if (kind === 'line') {
    return { ...base, fillColor: 'rgba(0, 0, 0, 0)' }
  }
  return base
}

export function featureStyleKindOf(feature: OlFeature<OlGeometry>): FeatureStyleKind {
  if (isSketchTextFeature(feature)) return 'text'
  const geom = feature.getGeometry()
  if (!geom) return 'polygon'
  if (geom instanceof Circle) {
    return getCircleKind(feature) === 'disc' ? 'disc' : 'circle'
  }
  const t = geom.getType()
  if (t === 'Point' || t === 'MultiPoint') return 'point'
  if (t === 'LineString' || t === 'MultiLineString') return 'line'
  return 'polygon'
}

function coerceAttrs(
  kind: FeatureStyleKind,
  partial:
    | (Partial<FeatureStyleAttrs> & {
        /** Ancien format import */
        fontWeight?: string
        fontStyle?: string
      })
    | undefined,
): FeatureStyleAttrs {
  const defaults = defaultFeatureStyleAttrs(kind)
  if (!partial || typeof partial !== 'object') return defaults
  const { fontWeight, fontStyle, ...rest } = partial
  const merged: FeatureStyleAttrs = { ...defaults, ...rest, kind }
  if (typeof rest.fontBold !== 'boolean' && fontWeight != null) {
    merged.fontBold =
      fontWeight === 'bold' || fontWeight === '700' || fontWeight === '600' || fontWeight === '500'
  }
  if (typeof rest.fontItalic !== 'boolean' && fontStyle != null) {
    merged.fontItalic = fontStyle === 'italic' || fontStyle === 'oblique'
  }
  return merged
}

function cssFont(attrs: FeatureStyleAttrs): string {
  const style = attrs.fontItalic ? 'italic' : 'normal'
  const weight = attrs.fontBold ? 'bold' : 'normal'
  return `${style} ${weight} ${attrs.fontSize}pt ${attrs.fontFamily}`
}

export function getFeatureStyleAttrs(feature: OlFeature<OlGeometry>): FeatureStyleAttrs {
  const kind = featureStyleKindOf(feature)
  const stored = feature.get(FEATURE_STYLE_PROP) as Partial<FeatureStyleAttrs> | undefined
  const textStored = feature.get(SKETCH_TEXT_PROP) as Partial<SketchTextAttrs> | undefined
  const base = coerceAttrs(kind, stored)
  return {
    ...base,
    kind,
    text: stored?.text ?? textStored?.text ?? String(feature.get('text') ?? base.text),
    fontSize: stored?.fontSize ?? textStored?.fontSize ?? base.fontSize,
    fontColor: stored?.fontColor ?? textStored?.fontColor ?? base.fontColor,
    textStrokeColor: stored?.textStrokeColor ?? textStored?.strokeColor ?? base.textStrokeColor,
    rotation: clampRotationDeg(stored?.rotation ?? textStored?.rotation ?? base.rotation),
  }
}

function strokeFromAttrs(attrs: FeatureStyleAttrs): Stroke {
  const dash = attrs.lineDash > 0 ? [attrs.lineDash, attrs.lineDash] : undefined
  return new Stroke({
    color: attrs.strokeColor,
    width: attrs.strokeWidth,
    lineCap: attrs.lineCap,
    lineJoin: attrs.lineJoin,
    lineDash: dash,
    lineDashOffset: attrs.lineDashOffset,
    miterLimit: attrs.miterLimit,
  })
}

function pointImageFromAttrs(attrs: FeatureStyleAttrs): CircleStyle | RegularShape {
  const fill = new Fill({ color: attrs.fillColor })
  const stroke = new Stroke({
    color: attrs.strokeColor,
    width: attrs.strokeWidth,
  })
  const rotation = (attrs.pointRotation * Math.PI) / 180
  if (attrs.pointShape === 'square') {
    return new RegularShape({
      fill,
      stroke,
      points: 4,
      radius: attrs.radius,
      angle: Math.PI / 4,
      rotation,
    })
  }
  if (attrs.pointShape === 'triangle') {
    return new RegularShape({
      fill,
      stroke,
      points: 3,
      radius: attrs.radius,
      rotation,
    })
  }
  if (attrs.pointShape === 'star') {
    return new RegularShape({
      fill,
      stroke,
      points: 5,
      radius: attrs.radius,
      radius2: attrs.radius / 2,
      rotation,
    })
  }
  return new CircleStyle({
    radius: attrs.radius,
    fill,
    stroke,
  })
}

export function buildFeatureStyle(attrs: FeatureStyleAttrs): Style {
  if (attrs.kind === 'text') {
    return new Style({
      zIndex: attrs.zIndex || undefined,
      text: new Text({
        text: attrs.text || DEFAULTS.text,
        font: cssFont(attrs),
        fill: new Fill({ color: attrs.fontColor }),
        stroke: new Stroke({
          color: attrs.textStrokeColor,
          width: attrs.textStrokeWidth,
        }),
        textAlign: 'center',
        textBaseline: 'middle',
        rotation: (clampRotationDeg(attrs.rotation) * Math.PI) / 180,
        rotateWithView: false,
      }),
    })
  }

  if (attrs.kind === 'point') {
    return new Style({
      zIndex: attrs.zIndex || undefined,
      image: pointImageFromAttrs(attrs),
    })
  }

  if (attrs.kind === 'line') {
    return new Style({
      zIndex: attrs.zIndex || undefined,
      stroke: strokeFromAttrs(attrs),
    })
  }

  return new Style({
    zIndex: attrs.zIndex || undefined,
    fill: new Fill({ color: attrs.fillColor }),
    stroke: strokeFromAttrs(attrs),
    image: new CircleStyle({
      radius: 5,
      fill: new Fill({ color: attrs.strokeColor }),
    }),
  })
}

/** Persiste le style dans les properties + applique le Style OL. */
export function applyFeatureStyle(feature: OlFeature<OlGeometry>, attrs: FeatureStyleAttrs): void {
  const kind = attrs.kind || featureStyleKindOf(feature)
  const normalized = coerceAttrs(kind, {
    ...attrs,
    kind,
    rotation: clampRotationDeg(attrs.rotation),
  })
  // Objet plat JSON-serializable pour import/export
  feature.set(FEATURE_STYLE_PROP, { ...normalized })
  if (kind === 'text') {
    feature.set(SKETCH_TEXT_PROP, {
      text: normalized.text,
      fontSize: normalized.fontSize,
      fontColor: normalized.fontColor,
      strokeColor: normalized.textStrokeColor,
      rotation: normalized.rotation,
    })
    feature.set('text', normalized.text)
  }
  feature.setStyle(buildFeatureStyle(normalized))
  feature.changed()
}

/** Réapplique le style stocké dans les properties (après import). */
export function restoreFeatureStyleFromProperties(feature: OlFeature<OlGeometry>): boolean {
  const stored = feature.get(FEATURE_STYLE_PROP)
  const text = feature.get(SKETCH_TEXT_PROP) || feature.get('text')
  if (!stored && !text) return false
  applyFeatureStyle(feature, getFeatureStyleAttrs(feature))
  return true
}

export function restoreFeaturesStyles(features: OlFeature<OlGeometry>[]): void {
  for (const f of features) restoreFeatureStyleFromProperties(f)
}

/** Points d’ancrage sur la géométrie (sommets / centre) pour l’appendice popup. */
export function featureStylePopupAnchorCandidates(feature: OlFeature<OlGeometry>): Coordinate[] {
  const geom = feature.getGeometry()
  if (!geom) return []
  if (geom instanceof Point) return [geom.getCoordinates()]
  if (geom instanceof MultiPoint) return geom.getCoordinates()
  if (geom instanceof Circle) return [geom.getCenter()]
  if (geom instanceof LineString) {
    const coords = geom.getCoordinates()
    // Sommets uniquement (composition de la ligne)
    return coords.length ? coords : []
  }
  if (geom instanceof MultiLineString) {
    return geom.getCoordinates().flat()
  }
  if (geom instanceof Polygon) {
    // Point intérieur (meilleur ancrage popup) + sommets de l’anneau
    const interior = geom.getInteriorPoint().getCoordinates().slice(0, 2) as Coordinate
    const ring = geom.getCoordinates()[0] || []
    const verts = ring.length > 1 ? ring.slice(0, -1) : ring
    return [interior, ...verts]
  }
  if (geom instanceof MultiPolygon) {
    const out: Coordinate[] = []
    for (const poly of geom.getPolygons()) {
      const interior = poly.getInteriorPoint().getCoordinates().slice(0, 2) as Coordinate
      out.push(interior)
      const ring = poly.getCoordinates()[0] || []
      if (ring.length > 1) out.push(...ring.slice(0, -1))
      else out.push(...ring)
    }
    return out
  }
  const extent = geom.getExtent()
  return [[(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2]]
}

/**
 * Ancre popup : un point réellement sur la feature.
 * Préfère un point visible ; pour les polygones, le point intérieur s’il est à l’écran,
 * sinon le sommet le plus haut (proche de l’appendice quand la popup est au-dessus).
 */
export function featureStylePopupAnchor(
  feature: OlFeature<OlGeometry>,
  mapSize?: number[] | null,
  getPixel?: ((coord: Coordinate) => number[] | null) | null,
): Coordinate | null {
  const candidates = featureStylePopupAnchorCandidates(feature)
  if (!candidates.length) return null
  if (!mapSize || !getPixel) {
    return candidates[0]
  }

  const scored = candidates.map((c, index) => {
    const p = getPixel(c)
    const onScreen = Boolean(
      p && p[0] >= 0 && p[1] >= 0 && p[0] <= mapSize[0] && p[1] <= mapSize[1],
    )
    return {
      c,
      p,
      onScreen,
      index,
      // Plus haut à l’écran = meilleur pour une popup au-dessus
      topRank: p ? p[1] : Number.POSITIVE_INFINITY,
    }
  })

  const pool = scored.filter((s) => s.onScreen)
  const use = pool.length ? pool : scored
  // Point intérieur (index 0 pour polygone) s’il est dans le pool, sinon sommet le plus haut
  const interior = use.find((s) => s.index === 0)
  if (interior && interior.onScreen) return interior.c
  use.sort((a, b) => a.topRank - b.topRank || a.index - b.index)
  return use[0].c
}

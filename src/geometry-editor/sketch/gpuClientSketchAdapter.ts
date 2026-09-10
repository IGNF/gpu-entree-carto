/**
 * Adaptateur import croquis gpu-client → entree-carto.
 *
 * Format gpu-client (ExportGeoJsonControl) :
 * - `properties.gpuGeometryType` : Point | LineString | Polygon | Text | …
 * - `properties.style` : fill/stroke/image/text (voir ImportGeoJsonControl.addStyleToFeatures)
 */
import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import {
  applyFeatureStyle,
  defaultFeatureStyleAttrs,
  featureStyleKindOf,
  FEATURE_STYLE_PROP,
  type FeatureStyleAttrs,
  type FeatureStyleKind,
} from './featureStyle'

/** Propriété style gpu-client (ExportGeoJsonControl.buildGeoJson). */
export interface GpuClientSketchStyle {
  fillColor?: string | null
  strokeColor?: string | null
  strokeWidth?: number | null
  imageRadius?: number | null
  imageFillColor?: string | null
  imageStrokeColor?: string | null
  imageStrokeWidth?: number | null
  textFillColor?: string | null
  textStrokeWidth?: number | null
  textStrokeColor?: string | null
  textFont?: string | null
  textText?: string | null
}

function parseGpuStyle(raw: unknown): GpuClientSketchStyle | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return parseGpuStyle(JSON.parse(raw))
    } catch {
      return null
    }
  }
  if (typeof raw !== 'object') return null
  return raw as GpuClientSketchStyle
}

function parseGpuFont(textFont: string | null | undefined): Pick<
  FeatureStyleAttrs,
  'fontSize' | 'fontFamily' | 'fontBold' | 'fontItalic'
> {
  const fallback = {
    fontSize: 14,
    fontFamily: 'Marianne, Calibri, sans-serif',
    fontBold: false,
    fontItalic: false,
  }
  if (!textFont) return fallback
  const fontBold = /\bbold\b/i.test(textFont)
  const fontItalic = /\bitalic\b/i.test(textFont)
  const sizeMatch = /(\d+(?:\.\d+)?)\s*pt/i.exec(textFont)
  const fontSize = sizeMatch ? Math.round(Number(sizeMatch[1])) : fallback.fontSize
  const afterPt = textFont.replace(/^.*?\d+(?:\.\d+)?\s*pt\s+/i, '').trim()
  const fontFamily = afterPt || fallback.fontFamily
  return { fontSize, fontFamily, fontBold, fontItalic }
}

function numOr(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function strOr(value: string | null | undefined, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function kindFromGpuType(
  gpuGeometryType: unknown,
  feature: OlFeature<OlGeometry>,
): FeatureStyleKind {
  const t = typeof gpuGeometryType === 'string' ? gpuGeometryType : ''
  if (t === 'Text') return 'text'
  if (t === 'Point') return 'point'
  if (t === 'LineString') return 'line'
  if (t === 'Polygon') return 'polygon'
  if (t === 'Disc') return 'disc'
  if (t === 'Circle') return 'circle'
  return featureStyleKindOf(feature)
}

/** Convertit `properties.style` gpu-client en `ec-feature-style` (+ texte). */
export function gpuClientStyleToFeatureStyleAttrs(
  kind: FeatureStyleKind,
  style: GpuClientSketchStyle,
): FeatureStyleAttrs {
  const base = defaultFeatureStyleAttrs(kind)
  const font = parseGpuFont(style.textFont)

  if (kind === 'text') {
    return {
      ...base,
      kind,
      text: strOr(style.textText, base.text),
      fontSize: font.fontSize,
      fontFamily: font.fontFamily,
      fontBold: font.fontBold,
      fontItalic: font.fontItalic,
      fontColor: strOr(style.textFillColor, base.fontColor),
      textStrokeColor: strOr(style.textStrokeColor, base.textStrokeColor),
      textStrokeWidth: numOr(style.textStrokeWidth, base.textStrokeWidth),
      strokeColor: strOr(style.textStrokeColor, base.textStrokeColor),
      strokeWidth: numOr(style.textStrokeWidth, base.textStrokeWidth),
      fillColor: 'rgba(0, 0, 0, 0)',
    }
  }

  if (kind === 'point') {
    return {
      ...base,
      kind,
      radius: numOr(style.imageRadius, base.radius),
      fillColor: strOr(style.imageFillColor ?? style.fillColor, base.fillColor),
      strokeColor: strOr(style.imageStrokeColor ?? style.strokeColor, base.strokeColor),
      strokeWidth: numOr(style.imageStrokeWidth ?? style.strokeWidth, base.strokeWidth),
    }
  }

  if (kind === 'line') {
    return {
      ...base,
      kind,
      strokeColor: strOr(style.strokeColor ?? style.imageStrokeColor, base.strokeColor),
      strokeWidth: numOr(style.strokeWidth ?? style.imageStrokeWidth, base.strokeWidth),
      fillColor: 'rgba(0, 0, 0, 0)',
    }
  }

  return {
    ...base,
    kind,
    fillColor: strOr(style.fillColor ?? style.imageFillColor, base.fillColor),
    strokeColor: strOr(style.strokeColor ?? style.imageStrokeColor, base.strokeColor),
    strokeWidth: numOr(style.strokeWidth ?? style.imageStrokeWidth, base.strokeWidth),
  }
}

/** Vrai si la feature ressemble à un export gpu-client non encore adapté. */
export function isGpuClientSketchFeature(feature: OlFeature<OlGeometry>): boolean {
  if (feature.get(FEATURE_STYLE_PROP)) return false
  return parseGpuStyle(feature.get('style')) !== null
}

/** Vrai si un FeatureCollection GeoJSON provient probablement de gpu-client. */
export function isGpuClientSketchExport(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const root = data as { type?: string; features?: Array<{ properties?: Record<string, unknown> }> }
  if (root.type !== 'FeatureCollection' || !Array.isArray(root.features)) return false
  return root.features.some((f) => {
    const props = f?.properties
    if (!props || props[FEATURE_STYLE_PROP]) return false
    return parseGpuStyle(props.style) !== null
  })
}

/**
 * Convertit les propriétés gpu-client en format entree-carto et applique le Style OL.
 * No-op si `ec-feature-style` est déjà présent.
 */
export function adaptGpuClientSketchFeatures(features: OlFeature<OlGeometry>[]): void {
  for (const feature of features) {
    if (feature.get(FEATURE_STYLE_PROP)) continue
    const gpuStyle = parseGpuStyle(feature.get('style'))
    if (!gpuStyle) continue

    const kind = kindFromGpuType(feature.get('gpuGeometryType'), feature)
    const attrs = gpuClientStyleToFeatureStyleAttrs(kind, gpuStyle)
    applyFeatureStyle(feature, attrs)
    feature.unset('style')
  }
}

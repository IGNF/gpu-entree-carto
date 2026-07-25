import type { Feature as OlFeature } from 'ol'
import type { Coordinate } from 'ol/coordinate'
import Style from 'ol/style/Style'
import Fill from 'ol/style/Fill'
import Stroke from 'ol/style/Stroke'
import Text from 'ol/style/Text'
import { Point } from 'ol/geom'

export const SKETCH_TEXT_PROP = 'ec-sketch-text'

export interface SketchTextAttrs {
  text: string
  fontSize: number
  fontColor: string
  /** Couleur du contour / halo du texte. */
  strokeColor: string
  /** Rotation en degrés (sens horaire OL / canvas). */
  rotation: number
}

const DEFAULTS: SketchTextAttrs = {
  text: 'Texte',
  fontSize: 14,
  fontColor: '#000091',
  strokeColor: '#ffffff',
  rotation: 0,
}

export function clampRotationDeg(value: number): number {
  if (!Number.isFinite(value)) return DEFAULTS.rotation
  let deg = ((value % 360) + 360) % 360
  if (deg > 180) deg -= 360
  return Math.round(deg * 10) / 10
}

export function sketchTextHitRadiusPx(attrs: SketchTextAttrs): number {
  const halfH = attrs.fontSize * 1.33 * 0.55
  const halfW = Math.max(attrs.text.length * attrs.fontSize * 0.35, 14)
  return Math.hypot(halfW, halfH) + 6
}

export function sketchTextRotateAnchor(
  point: Point,
  attrs: SketchTextAttrs,
  mapResolution: number,
): [number, number] {
  const c = point.getCoordinates()
  const halfHPx = attrs.fontSize * 1.33 * 0.55
  const iconClearancePx = 22
  const dist = (halfHPx + iconClearancePx) * mapResolution
  const rad = (attrs.rotation * Math.PI) / 180
  return [c[0] - Math.sin(rad) * dist, c[1] + Math.cos(rad) * dist]
}

export function isSketchTextFeature(feature: OlFeature): boolean {
  return Boolean(feature.get(SKETCH_TEXT_PROP)) || Boolean(feature.get('text'))
}

export function isNearSketchText(
  feature: OlFeature,
  coord: Coordinate,
  mapResolution: number,
): boolean {
  if (!isSketchTextFeature(feature)) return false
  const geom = feature.getGeometry()
  if (!(geom instanceof Point)) return false
  const attrs = getSketchTextAttrs(feature)
  const radius = sketchTextHitRadiusPx(attrs) * mapResolution
  const c = geom.getCoordinates()
  return Math.hypot(coord[0] - c[0], coord[1] - c[1]) <= radius
}

/** Style dessin / feature : texte seul, centré sur le Point (pas de pastille). */
export function sketchTextStyle(attrs: Partial<SketchTextAttrs> = {}): Style {
  const text = attrs.text || DEFAULTS.text
  const fontSize = attrs.fontSize ?? DEFAULTS.fontSize
  const fontColor = attrs.fontColor || DEFAULTS.fontColor
  const strokeColor = attrs.strokeColor || DEFAULTS.strokeColor
  const rotationDeg = attrs.rotation ?? DEFAULTS.rotation
  return new Style({
    text: new Text({
      text,
      font: `${fontSize}pt Marianne, Calibri, sans-serif`,
      fill: new Fill({ color: fontColor }),
      stroke: new Stroke({ color: strokeColor, width: 3 }),
      textAlign: 'center',
      textBaseline: 'middle',
      rotation: (rotationDeg * Math.PI) / 180,
      rotateWithView: false,
    }),
  })
}

export function getSketchTextAttrs(feature: OlFeature): SketchTextAttrs {
  const stored = feature.get(SKETCH_TEXT_PROP) as Partial<SketchTextAttrs> | undefined
  const fromStyle = feature.getStyle()
  let text = stored?.text ?? String(feature.get('text') ?? DEFAULTS.text)
  let fontSize = stored?.fontSize ?? DEFAULTS.fontSize
  let fontColor = stored?.fontColor ?? DEFAULTS.fontColor
  let strokeColor = stored?.strokeColor ?? DEFAULTS.strokeColor
  let rotation = stored?.rotation ?? DEFAULTS.rotation
  if (fromStyle instanceof Style) {
    const t = fromStyle.getText()
    if (t) {
      const rawText = t.getText()
      if (typeof rawText === 'string' && rawText) text = rawText
      else if (Array.isArray(rawText) && rawText.length) text = rawText.join('')
      const fill = t.getFill()?.getColor()
      if (typeof fill === 'string') fontColor = fill
      const stroke = t.getStroke()?.getColor()
      if (typeof stroke === 'string' && stored?.strokeColor === undefined) {
        strokeColor = stroke
      }
      const font = t.getFont() || ''
      const m = /(\d+(?:\.\d+)?)\s*pt/i.exec(font)
      if (m) fontSize = Number(m[1])
      if (stored?.rotation === undefined) {
        const rad = t.getRotation()
        if (typeof rad === 'number' && Number.isFinite(rad)) {
          rotation = clampRotationDeg((rad * 180) / Math.PI)
        }
      }
    }
  }
  return {
    text,
    fontSize,
    fontColor,
    strokeColor,
    rotation: clampRotationDeg(rotation),
  }
}

export function applySketchTextStyle(
  feature: OlFeature,
  attrs: SketchTextAttrs,
): void {
  const normalized: SketchTextAttrs = {
    ...DEFAULTS,
    ...attrs,
    strokeColor: attrs.strokeColor || DEFAULTS.strokeColor,
    rotation: clampRotationDeg(attrs.rotation),
  }
  feature.set(SKETCH_TEXT_PROP, { ...normalized })
  feature.set('text', normalized.text)
  feature.setStyle(sketchTextStyle(normalized))
  feature.changed()
}

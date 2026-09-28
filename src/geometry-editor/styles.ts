import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import CircleGeom from 'ol/geom/Circle'
import type { FeatureLike } from 'ol/Feature'
import { getCircleKind } from './circleHelpers'

const blue = '#000091'
/** Remplissage polygone / disque (feature terminée). */
export const SKETCH_AREA_FILL = 'rgba(0, 0, 145, 0.2)'
/** Remplissage pendant le croquis (Draw). */
export const SKETCH_AREA_DRAW_FILL = 'rgba(0, 0, 145, 0.15)'

export const geometryFeatureStyle = new Style({
  fill: new Fill({ color: SKETCH_AREA_FILL }),
  stroke: new Stroke({ color: blue, width: 2 }),
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: blue }),
    stroke: new Stroke({ color: '#fff', width: 2 }),
  }),
})

/** Cercle : contour seul. */
export const circleOutlineStyle = new Style({
  fill: new Fill({ color: 'rgba(0,0,0,0)' }),
  stroke: new Stroke({ color: blue, width: 2 }),
})

/** Disque : même remplissage que polygone. */
export const discFillStyle = new Style({
  fill: new Fill({ color: SKETCH_AREA_FILL }),
  stroke: new Stroke({ color: blue, width: 2 }),
})

export const geometryDrawStyle = new Style({
  fill: new Fill({ color: SKETCH_AREA_DRAW_FILL }),
  stroke: new Stroke({ color: blue, width: 2, lineDash: [6, 4] }),
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: blue }),
  }),
})

/** Croquis cercle (contour) + point sous le curseur (centre). */
export const circleDrawStyle = new Style({
  fill: new Fill({ color: 'rgba(0,0,0,0)' }),
  stroke: new Stroke({ color: blue, width: 2, lineDash: [6, 4] }),
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: blue }),
  }),
})

/** Croquis disque + point sous le curseur (centre) — même remplissage que polygone en cours. */
export const discDrawStyle = new Style({
  fill: new Fill({ color: SKETCH_AREA_DRAW_FILL }),
  stroke: new Stroke({ color: blue, width: 2, lineDash: [6, 4] }),
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: blue }),
  }),
})

export function geometryStyleFunction(feature: FeatureLike): Style {
  const geom = feature.getGeometry?.()
  if (geom instanceof CircleGeom) {
    return getCircleKind(feature as never) === 'disc' ? discFillStyle : circleOutlineStyle
  }
  return geometryFeatureStyle
}

import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import type { FeatureLike } from 'ol/Feature'

const blue = '#000091'
const fillBlue = 'rgba(0, 0, 145, 0.2)'

export const geometryFeatureStyle = new Style({
  fill: new Fill({ color: fillBlue }),
  stroke: new Stroke({ color: blue, width: 2 }),
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: blue }),
    stroke: new Stroke({ color: '#fff', width: 2 }),
  }),
})

export const geometryDrawStyle = new Style({
  fill: new Fill({ color: 'rgba(0, 0, 145, 0.15)' }),
  stroke: new Stroke({ color: blue, width: 2, lineDash: [6, 4] }),
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: blue }),
  }),
})

export function geometryStyleFunction(_feature: FeatureLike): Style {
  return geometryFeatureStyle
}

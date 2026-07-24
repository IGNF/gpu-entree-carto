/**
 * Helpers OpenLayers du bundle (même instance que la carte).
 * Pour gpu-site : éviter d’injecter des Feature/Style créés avec un autre `ol.js`.
 */
import Feature from 'ol/Feature'
import WKT from 'ol/format/WKT'
import type { Geometry as OlGeometry } from 'ol/geom'
import { Fill, Stroke, Style } from 'ol/style'
import type { Feature as OlFeature } from 'ol'

export interface SimpleStyleOptions {
  fill?: string
  stroke?: string
  strokeWidth?: number
}

/** Lit un WKT (EPSG:4326) vers une Feature en projection carte (EPSG:3857). */
export function featureFromWkt(wkt: string): OlFeature<OlGeometry> {
  const geometry = new WKT().readGeometry(wkt, {
    featureProjection: 'EPSG:3857',
    dataProjection: 'EPSG:4326',
  })
  return new Feature({ geometry })
}

/** Calcule une bbox WKT `[minX,minY,maxX,maxY]` en EPSG:4326. */
export function bboxStringFromWkt(wkt: string): string {
  const extent = new WKT().readGeometry(wkt).getExtent()
  return `[${extent.join(',')}]`
}

export function createSimpleStyle(opts: SimpleStyleOptions): Style {
  return new Style({
    fill: new Fill({
      color: opts.fill ?? 'rgba(0,0,145,0.2)',
    }),
    stroke: new Stroke({
      color: opts.stroke ?? 'rgba(0,0,145,1)',
      width: opts.strokeWidth ?? 2,
    }),
  })
}

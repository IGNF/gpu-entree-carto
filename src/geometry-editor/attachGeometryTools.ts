/**
 * Attache les outils de dessin / édition à une Map OpenLayers déjà créée
 * (carte principale ou autre). Pas de mini-carte ni de champ HTML.
 *
 * Terrain pour le croquis type gpu-client (DrawBar) : même DrawToolsBar que
 * le geometry-editor formulaire.
 */
import type Map from 'ol/Map'
import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import type { StyleLike } from 'ol/style/Style'
import { DrawToolsBar } from './DrawToolsBar'
import { parseRawToFeatures } from './parseGeometry'
import { serializeFeatures } from './serializeGeometry'
import { geometryStyleFunction } from './styles'
import { restoreCircleFeaturesForKind } from './circleHelpers'
import {
  parseGeometryTypes,
  primaryGeometryType,
} from './geometryTypeUtils'
import type {
  GeometryOutputFormat,
  GeometryTypeOption,
} from './types'

export interface AttachGeometryToolsOptions {
  /** Conteneur DOM de la barre d’outils (positionné par l’appelant). */
  target: HTMLElement
  /** Types d’outils (CSV accepté, ex. `'Point,LineString,Polygon'`). */
  geometryType?: GeometryTypeOption
  /** Source existante ; sinon créée. */
  source?: VectorSource
  /** Couche existante ; sinon créée et ajoutée à la map. */
  layer?: VectorLayer
  /** Style features / croquis ; défaut bleu France. */
  style?: StyleLike | null
  /** zIndex de la couche si elle est créée ici. */
  zIndex?: number
  /** Appelé après chaque dessin / modification / suppression. */
  onChange?: (features: OlFeature<OlGeometry>[]) => void
}

export interface AttachGeometryToolsHandle {
  map: Map
  source: VectorSource
  layer: VectorLayer
  drawBar: DrawToolsBar
  getFeatures: () => OlFeature<OlGeometry>[]
  setFeatures: (features: OlFeature<OlGeometry>[]) => void
  /** Charge une chaîne GeoJSON / KML / bbox / Circle… dans la source. */
  load: (raw: string) => void
  /** Sérialise la source (même règles que le geometry-editor formulaire). */
  serialize: (opts?: {
    geometryType?: GeometryTypeOption
    outputFormat?: GeometryOutputFormat
    precision?: number
  }) => string
  setGeometryType: (geometryType: GeometryTypeOption) => void
  setStyle: (style: StyleLike | null | undefined) => void
  destroy: () => void
}

/**
 * Branche DrawToolsBar sur `map` sans créer de vue ni de champ formulaire.
 */
export function attachGeometryTools(
  map: Map,
  options: AttachGeometryToolsOptions,
): AttachGeometryToolsHandle {
  const geometryType = options.geometryType ?? 'Geometry'
  const ownsSource = !options.source
  const source = options.source ?? new VectorSource({ wrapX: false })

  let layer = options.layer
  let ownsLayer = false
  if (!layer) {
    layer = new VectorLayer({
      source,
      style: options.style ?? geometryStyleFunction,
      zIndex: options.zIndex ?? 500,
      className: 'ec-geometry-editor__sketch-layer',
    })
    layer.set('ec-geometry-tools', true)
    map.addLayer(layer)
    ownsLayer = true
  } else if (options.style !== undefined) {
    layer.setStyle(options.style ?? geometryStyleFunction)
  }

  const notify = (): void => {
    options.onChange?.(
      source.getFeatures() as OlFeature<OlGeometry>[],
    )
  }

  const drawBar = new DrawToolsBar({
    map,
    source,
    layer,
    geometryType,
    target: options.target,
    style: options.style,
    onChange: notify,
  })

  return {
    map,
    source,
    layer,
    drawBar,
    getFeatures: () => source.getFeatures() as OlFeature<OlGeometry>[],
    setFeatures: (features) => {
      source.clear(true)
      if (features.length) source.addFeatures(features)
      notify()
    },
    load: (raw) => {
      let features = parseRawToFeatures(raw)
      const primary = primaryGeometryType(parseGeometryTypes(geometryType))
      if (primary === 'Circle' || primary === 'MultiCircle') {
        features = restoreCircleFeaturesForKind(features, 'circle')
      } else if (primary === 'Disc' || primary === 'MultiDisc') {
        features = restoreCircleFeaturesForKind(features, 'disc')
      }
      source.clear(true)
      if (features.length) source.addFeatures(features)
      notify()
    },
    serialize: (opts = {}) =>
      serializeFeatures(source.getFeatures() as OlFeature<OlGeometry>[], {
        geometryType: opts.geometryType ?? geometryType,
        outputFormat: opts.outputFormat ?? 'geojson',
        precision: opts.precision ?? 7,
      }),
    setGeometryType: (next) => {
      drawBar.setGeometryType(next)
    },
    setStyle: (style) => {
      layer!.setStyle(style ?? geometryStyleFunction)
      drawBar.setStyle(style)
    },
    destroy: () => {
      drawBar.destroy()
      if (ownsLayer) {
        map.removeLayer(layer!)
      }
      if (ownsSource) {
        source.clear(true)
      }
      options.target.replaceChildren()
    },
  }
}

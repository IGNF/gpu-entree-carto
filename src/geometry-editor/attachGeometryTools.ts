/**
 * Attache les outils de dessin / édition à une Map OpenLayers déjà créée
 * (carte principale ou autre). Pas de mini-carte ni de champ HTML.
 *
 * Délègue à {@link SketchControl} (même moteur que GeometryEditor).
 */
import type Map from 'ol/Map'
import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import type VectorLayer from 'ol/layer/Vector'
import type VectorSource from 'ol/source/Vector'
import type { StyleLike } from 'ol/style/Style'
import { DrawToolsBar } from './DrawToolsBar'
import {
  SketchControl,
  type SketchExtraTool,
} from './SketchControl'
import type {
  GeometryOutputFormat,
  GeometryTypeOption,
  ToolsToggleCorner,
} from './types'

export interface AttachGeometryToolsOptions {
  /**
   * @deprecated Préférer `toolsToggle` / le chrome SketchControl.
   * Si fourni, la barre est montée dans cet élément (toolsToggle ignoré).
   */
  target?: HTMLElement
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
  toolsToggle?: ToolsToggleCorner | null
  position?: ToolsToggleCorner
  localStorageKey?: string | null
  clearAll?: boolean
  extraTools?: SketchExtraTool[]
}

export interface AttachGeometryToolsHandle {
  map: Map
  source: VectorSource
  layer: VectorLayer
  drawBar: DrawToolsBar
  sketch: SketchControl
  getFeatures: () => OlFeature<OlGeometry>[]
  setFeatures: (features: OlFeature<OlGeometry>[]) => void
  load: (raw: string) => void
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
 * Branche SketchControl sur `map` sans créer de vue ni de champ formulaire.
 */
export function attachGeometryTools(
  map: Map,
  options: AttachGeometryToolsOptions,
): AttachGeometryToolsHandle {
  const sketch = new SketchControl({
    geometryType: options.geometryType ?? 'Geometry',
    toolsToggle: options.target ? null : (options.toolsToggle ?? null),
    position: options.position,
    source: options.source,
    layer: options.layer,
    style: options.style,
    zIndex: options.zIndex,
    onChange: options.onChange,
    localStorageKey: options.localStorageKey,
    clearAll: options.clearAll,
    extraTools: options.extraTools,
  })
  map.addControl(sketch)

  if (options.target) {
    const toolbar = sketch
      .getElement()
      .querySelector('.ec-geometry-editor__toolbar')
    if (toolbar instanceof HTMLElement) {
      options.target.replaceChildren(toolbar)
    }
    sketch.getElement().hidden = true
  }

  const layer = sketch.getLayer()
  if (!layer) {
    map.removeControl(sketch)
    throw new Error('[attachGeometryTools] couche croquis indisponible')
  }

  return {
    map,
    source: sketch.getSource(),
    layer,
    get drawBar() {
      const bar = sketch.getDrawBar()
      if (!bar) {
        throw new Error('[attachGeometryTools] DrawToolsBar indisponible')
      }
      return bar
    },
    sketch,
    getFeatures: () => sketch.getFeatures(),
    setFeatures: (features) => sketch.setFeatures(features),
    load: (raw) => sketch.load(raw),
    serialize: (opts) => sketch.serialize(opts),
    setGeometryType: (next) => sketch.setGeometryType(next),
    setStyle: (style) => sketch.setStyle(style),
    destroy: () => {
      map.removeControl(sketch)
      options.target?.replaceChildren()
    },
  }
}

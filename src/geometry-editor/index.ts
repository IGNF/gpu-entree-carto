import 'ol/ol.css'
import './styles/geometry-editor.css'
import { GeometryEditor } from './GeometryEditor'
import type { GeometryEditorOptions } from './types'
import { attachGeometryTools } from './attachGeometryTools'
import { SketchControl } from './SketchControl'
import { featureFromWkt, bboxStringFromWkt, createSimpleStyle } from './olHelpers'

export type {
  GeometryEditorOptions,
  GeometryTypeOption,
  GeometryTypeName,
  TileLayerConfig,
  ToolsToggleCorner,
  StyleLike,
} from './types'
export { GEOMETRY_TYPE_NAMES } from './types'
export { FUTURE_GEOMETRY_TOOL_NAMES, type FutureGeometryToolName } from './geometryTypeUtils'

export { GeometryEditor } from './GeometryEditor'
export { DEFAULT_GEOMETRY_EDITOR_OPTIONS } from './types'
export { SketchControl } from './SketchControl'
export type { SketchControlOptions, SketchExtraTool } from './SketchControl'
export { attachGeometryTools } from './attachGeometryTools'
export type { AttachGeometryToolsHandle, AttachGeometryToolsOptions } from './attachGeometryTools'
export { featureFromWkt, bboxStringFromWkt, createSimpleStyle } from './olHelpers'
export type { SimpleStyleOptions } from './olHelpers'

export interface MountGeometryEditorHandle {
  editor: GeometryEditor
  setOptions: (patch: GeometryEditorOptions) => void
  resetOptions: () => void
  destroy: () => void
}

/**
 * Associe une mini-carte d’édition à un champ / élément HTML.
 */
export function mountGeometryEditor(
  element: HTMLElement | string,
  options?: GeometryEditorOptions,
): MountGeometryEditorHandle {
  const el = typeof element === 'string' ? document.querySelector<HTMLElement>(element) : element
  if (!el) {
    throw new Error('[entree-carto-geometry-editor] élément introuvable')
  }
  const editor = new GeometryEditor(el, options)
  return {
    editor,
    setOptions: (patch) => editor.setOptions(patch),
    resetOptions: () => editor.resetOptions(),
    destroy: () => editor.destroy(),
  }
}

const publicApi = {
  mountGeometryEditor,
  attachGeometryTools,
  GeometryEditor,
  SketchControl,
  featureFromWkt,
  bboxStringFromWkt,
  createSimpleStyle,
}

export default publicApi

if (typeof window !== 'undefined') {
  ;(window as Window & { EntreeCartoGeometryEditor?: typeof publicApi }).EntreeCartoGeometryEditor =
    publicApi
}

declare global {
  interface Window {
    EntreeCartoGeometryEditor: typeof publicApi
  }
}

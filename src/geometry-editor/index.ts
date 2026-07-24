import 'ol/ol.css'
import './styles/geometry-editor.css'
import { GeometryEditor } from './GeometryEditor'
import type { GeometryEditorOptions } from './types'

export type {
  GeometryEditorOptions,
  GeometryTypeOption,
  TileLayerConfig,
  StyleLike,
} from './types'

export { GeometryEditor } from './GeometryEditor'
export { DEFAULT_GEOMETRY_EDITOR_OPTIONS } from './types'

export interface MountGeometryEditorHandle {
  editor: GeometryEditor
  setOptions: (patch: GeometryEditorOptions) => void
  destroy: () => void
}

/**
 * Associe une mini-carte d’édition à un champ / élément HTML.
 */
export function mountGeometryEditor(
  element: HTMLElement | string,
  options?: GeometryEditorOptions,
): MountGeometryEditorHandle {
  const el =
    typeof element === 'string'
      ? document.querySelector<HTMLElement>(element)
      : element
  if (!el) {
    throw new Error('[entree-carto-geometry-editor] élément introuvable')
  }
  const editor = new GeometryEditor(el, options)
  return {
    editor,
    setOptions: (patch) => editor.setOptions(patch),
    destroy: () => editor.destroy(),
  }
}

const api = {
  mountGeometryEditor,
  GeometryEditor,
}

export default api

if (typeof window !== 'undefined') {
  ;(window as Window & { EntreeCartoGeometryEditor?: typeof api }).EntreeCartoGeometryEditor =
    api
}

declare global {
  interface Window {
    EntreeCartoGeometryEditor: typeof api
  }
}

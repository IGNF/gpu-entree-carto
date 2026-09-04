/**
 * Bundle standalone entree-carto-sketch
 * API globale : window.EntreeCartoSketch
 */
import 'ol/ol.css'
import '@/geometry-editor/styles/geometry-editor.css'
import { SketchControl } from '@/geometry-editor/SketchControl'
import { attachGeometryTools } from '@/geometry-editor/attachGeometryTools'
import { mountSketch } from './mountSketch'

export type { SketchControlOptions, SketchExtraTool } from '@/geometry-editor/SketchControl'
export type {
  AttachGeometryToolsHandle,
  AttachGeometryToolsOptions,
} from '@/geometry-editor/attachGeometryTools'
export type { MountSketchOptions, MountSketchHandle } from './mountSketch'
export type { ToolsToggleCorner, GeometryTypeOption } from '@/geometry-editor/types'

export { SketchControl } from '@/geometry-editor/SketchControl'
export { attachGeometryTools } from '@/geometry-editor/attachGeometryTools'
export { mountSketch } from './mountSketch'

const publicApi = {
  mountSketch,
  attachGeometryTools,
  SketchControl,
}

export default publicApi

if (typeof window !== 'undefined') {
  ;(window as Window & { EntreeCartoSketch?: typeof publicApi }).EntreeCartoSketch = publicApi
}

declare global {
  interface Window {
    EntreeCartoSketch: typeof publicApi
  }
}

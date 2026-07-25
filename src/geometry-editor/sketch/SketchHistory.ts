import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import type VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import type { ProjectionLike } from 'ol/proj'
import { hydrateImportedSketchFeatures } from './sketchIo'

const GEOJSON = new GeoJSON()
const MAX = 50

/**
 * Historique undo/redo des features croquis (snapshots GeoJSON).
 */
export class SketchHistory {
  private undoStack: string[] = []
  private redoStack: string[] = []
  private suppress = false

  constructor(
    private readonly source: VectorSource,
    private readonly getProjection: () => ProjectionLike | undefined,
  ) {}

  /** Enregistre l’état courant (avant mutation ou après stabilisation). */
  push(): void {
    if (this.suppress) return
    const snap = this.snapshot()
    const last = this.undoStack[this.undoStack.length - 1]
    if (snap === last) return
    this.undoStack.push(snap)
    if (this.undoStack.length > MAX) this.undoStack.shift()
    this.redoStack = []
  }

  canUndo(): boolean {
    return this.undoStack.length > 1
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  undo(): boolean {
    if (!this.canUndo()) return false
    const current = this.undoStack.pop()!
    this.redoStack.push(current)
    const prev = this.undoStack[this.undoStack.length - 1]
    this.restore(prev)
    return true
  }

  redo(): boolean {
    if (!this.canRedo()) return false
    const next = this.redoStack.pop()!
    this.undoStack.push(next)
    this.restore(next)
    return true
  }

  /** Après restoreFromLocalStorage / setFeatures externe. */
  resetFromSource(): void {
    this.undoStack = [this.snapshot()]
    this.redoStack = []
  }

  private snapshot(): string {
    const features = this.source.getFeatures() as OlFeature<OlGeometry>[]
    const projection = this.getProjection()
    return JSON.stringify(
      GEOJSON.writeFeaturesObject(features, {
        featureProjection: projection,
        dataProjection: 'EPSG:4326',
      }),
    )
  }

  private restore(raw: string): void {
    this.suppress = true
    try {
      const features = GEOJSON.readFeatures(JSON.parse(raw), {
        featureProjection: this.getProjection(),
        dataProjection: 'EPSG:4326',
      }) as OlFeature<OlGeometry>[]
      hydrateImportedSketchFeatures(features)
      this.source.clear(true)
      if (features.length) this.source.addFeatures(features)
    } finally {
      this.suppress = false
    }
  }
}

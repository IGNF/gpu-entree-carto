import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import type VectorSource from 'ol/source/Vector'
import type Map from 'ol/Map'
import { sketchFeaturesFromSnapshot, sketchFeaturesSnapshot } from './sketchIo'

const MAX = 50

export interface SketchHistoryPersisted {
  version: 1
  undo: string[]
  redo: string[]
}

/** Clé localStorage dérivée pour l’historique undo/redo (écrite au Enregistrer). */
export function sketchHistoryStorageKey(baseKey: string): string {
  return `${baseKey}:history`
}

/**
 * Historique undo/redo des features croquis (snapshots GeoJSON).
 * Persisté uniquement via le bouton Enregistrer (SketchControl).
 */
export class SketchHistory {
  private undoStack: string[] = []
  private redoStack: string[] = []
  private suppress = false

  constructor(
    private readonly source: VectorSource,
    private readonly getMap: () => Map | null,
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

  /** Initialise l’historique depuis l’état courant (sans persistance). */
  resetFromSource(): void {
    this.undoStack = [this.snapshot()]
    this.redoStack = []
  }

  /** Restaure piles + features depuis le dernier Enregistrer. */
  restoreFromLocalStorage(storageKey: string): boolean {
    if (typeof localStorage === 'undefined') return false
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return false
      const data = JSON.parse(raw) as SketchHistoryPersisted
      if (data?.version !== 1 || !Array.isArray(data.undo) || !data.undo.length) {
        return false
      }
      this.undoStack = data.undo.slice(-MAX)
      this.redoStack = Array.isArray(data.redo) ? data.redo.slice(-MAX) : []
      const current = this.undoStack[this.undoStack.length - 1]
      this.restore(current)
      return true
    } catch {
      return false
    }
  }

  /** Sérialise les piles undo/redo (appelé au Enregistrer). */
  persistToLocalStorage(storageKey: string): void {
    if (typeof localStorage === 'undefined') return
    try {
      if (!this.undoStack.length) {
        localStorage.removeItem(storageKey)
        return
      }
      const payload: SketchHistoryPersisted = {
        version: 1,
        undo: this.undoStack,
        redo: this.redoStack,
      }
      localStorage.setItem(storageKey, JSON.stringify(payload))
    } catch (err) {
      console.warn('[SketchHistory] localStorage persist failed', err)
    }
  }

  clearLocalStorage(storageKey: string): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(storageKey)
    } catch {
      /* ignore */
    }
  }

  private snapshot(): string {
    const map = this.getMap()
    if (!map) return '{"type":"FeatureCollection","features":[]}'
    const features = this.source.getFeatures() as OlFeature<OlGeometry>[]
    return sketchFeaturesSnapshot(map, features)
  }

  private restore(raw: string): void {
    const map = this.getMap()
    if (!map) return
    this.suppress = true
    try {
      const features = sketchFeaturesFromSnapshot(map, raw)
      this.source.clear(true)
      if (features.length) this.source.addFeatures(features)
    } finally {
      this.suppress = false
    }
  }
}

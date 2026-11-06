export interface StandardViewerSearch {
  fullText?: string
  position?: { x: number; y: number }
  type?: string
  kind?: string
  /** Sous-type lieu geopf (`municipality`, `housenumber`, …) — handoff accueil → carte pour le mode par défaut. */
  placeKind?: string
  poiType?: string[]
}

export interface StandardViewerDocument {
  id?: string
  type?: string
  status?: string
  name?: string
  bbox?: string
}

export interface StandardViewerParams {
  bbox?: number[] | null
  document?: StandardViewerDocument | null
  search?: StandardViewerSearch | null
  /** `1` parcelle, `2` territoire (défaut). Permalink : `mode=`. */
  mode?: 1 | 2
  layerConfig?: unknown
  legendConfig?: unknown
  legendReferences?: unknown
  departments?: unknown
  duCategories?: unknown
  supCategories?: unknown
  extraHelpLayerElements?: unknown[]
}

export interface ParcelViewerOptions {
  layerConfig?: unknown
  legendConfig?: unknown
  duCategories?: unknown
  supCategories?: unknown
}

export interface AutocompleteLocation {
  fullText: string
  type?: string
  kind?: string
  placeKind?: string
  poiType?: string[]
  position: { x: number; y: number }
}

declare global {
  interface Window {
    Gp?: {
      Services: {
        autoComplete: (options: Record<string, unknown>) => void
        geocode: (options: Record<string, unknown>) => void
      }
    }
  }
}

export {}

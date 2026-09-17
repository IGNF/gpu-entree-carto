export interface LegendItem {
  id: string
  title: string
  /** URL figée (fallback démo) ou dernière résolution. */
  imageUrl?: string
  /** Chemin image sans suffixe d’échelle (gpu-client LegendImages). */
  legendImageName?: string
  /** Plusieurs symboles (pct / lin / surf) sur une même ligne de légende. */
  legendImageNames?: string[]
  legendImagePath?: string
  legendScaleDependant?: boolean
  legendScaleThreshold?: number
}

export interface LayerTreeNode {
  id: string
  title: string
  visible: boolean
}

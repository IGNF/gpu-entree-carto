export interface LegendItem {
  id: string
  title: string
  /** URL d'image de légende (optionnel en stub). */
  imageUrl?: string
}

export interface LayerTreeNode {
  id: string
  title: string
  visible: boolean
}

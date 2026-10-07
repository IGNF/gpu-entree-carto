import type { LayerTreeNode, LegendItem } from '@/types/stubs'

export interface TreeLayerNode extends LayerTreeNode {
  children?: TreeLayerNode[]
  legend?: LegendItem[]
  /** Sous-arbre replié au chargement (hideLayers gpu-client). */
  defaultCollapsed?: boolean
  /** Couche virtuelle (regroupement sans WMS direct). */
  gpuVirtual?: boolean
  /** WMS cartographique (non virtual, avec `name` ; onlyLegend inclus). */
  gpuMapLayer?: boolean
  /** Pas de ligne dans le sélecteur ; tuile WMS possible si `gpuMapLayer`. */
  gpuOnlyLegend?: boolean
  gpuForceOpacity?: boolean
  /** Opacité initiale 0–100 (depuis LAYER_CONFIG.opacity). */
  gpuDefaultOpacity?: number
  /** Enfants masqués dans le sélecteur (`hideLayers`) mais toujours pilotés par le parent virtual. */
  hiddenCatalogChildren?: TreeLayerNode[]
  /** Sous-arbre masqué dans le sélecteur (`hideLayers`) — une seule ligne parent dans Couches de données. */
  gpuHideLayers?: boolean
  /** Plage zoom effective (héritage gpu-client LAYER_CONFIG). */
  gpuMinZoomLevel?: number
  gpuMaxZoomLevel?: number
}

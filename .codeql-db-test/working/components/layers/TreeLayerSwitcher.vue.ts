/**
 * Arbre de couches + légende intégrée (équivalent TreeLayerSwitcher + Legend gpu-client).
 * Pour l’instant : nœuds plats / légende stub ; branchera sur layerConfig plus tard.
 */
import { computed } from 'vue'
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

const props = withDefaults(
  defineProps<{
    nodes: TreeLayerNode[]
    /** Catalogue : checkbox + titre uniquement (pas de légende sous le nœud). */
    variant?: 'full' | 'catalog'
    /** État coché (catalogue) — sinon `node.visible`. */
    checkedById?: Record<string, boolean>
  }>(),
  {
    variant: 'full',
    checkedById: undefined,
  },
)

const emit = defineEmits<{
  toggle: [id: string, visible: boolean]
}>()

const flatLegend = computed(() => {
  const items: LegendItem[] = []
  function walk(nodes: TreeLayerNode[]) {
    for (const n of nodes) {
      if (n.visible && n.legend?.length) items.push(...n.legend)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(props.nodes)
  return items
})

function isChecked(node: TreeLayerNode): boolean {
  if (props.variant === 'catalog' && props.checkedById) {
    return Boolean(props.checkedById[node.id])
  }
  return Boolean(node.visible)
}

function onChange(node: TreeLayerNode, checked: boolean) {
  emit('toggle', node.id, checked)
}

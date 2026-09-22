/**
 * Arbre catalogue gpu-client (LAYER_CONFIG) — checkbox + titre, repliable.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { catalogDomIdFromNodeId } from '@/lib/layerConfig/catalogTreeSearch'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import { catalogSwitcherDisplayNodes } from '@/lib/layerConfig/catalogLayerTargets'
import { catalogAncestorIdsToExpand, flattenCatalogNodes } from '@/lib/layerConfig/catalogTreeIndex'
import { isCatalogNodeInZoomRange } from '@/lib/layerConfig/catalogLayerZoomRange'

const props = defineProps<{
  nodes: TreeLayerNode[]
  checkedById: Record<string, boolean>
  mapZoom: number
  depth?: number
  /** Racines LAYER_CONFIG (index complet) — renseigné seulement à la racine du composant. */
  catalogRoots?: TreeLayerNode[]
  /** Ancestres à garder dépliés (propagé aux instances imbriquées). */
  expandAncestorIds?: ReadonlySet<string>
  /** Dépliage forcé (recherche catalogue). */
  pinnedExpandIds?: ReadonlySet<string>
  highlightedNodeIds?: ReadonlySet<string>
  /** Racine seule : scroll + surbrillance après `focusCatalogNode`. */
  focusCatalogNodeId?: string | null
}>()

const emit = defineEmits<{
  toggle: [id: string, checked: boolean]
  'unpin-expand': [id: string]
}>()

const displayNodes = computed(() => catalogSwitcherDisplayNodes(props.nodes))

const expandAncestorIds = computed(() => {
  if (props.expandAncestorIds) return props.expandAncestorIds
  const roots = props.catalogRoots ?? props.nodes
  return catalogAncestorIdsToExpand(roots, props.checkedById)
})

const collapsedById = ref<Record<string, boolean>>({})

watch(
  () =>
    flattenCatalogNodes(props.catalogRoots ?? props.nodes)
      .map((n) => n.id)
      .join('|'),
  () => {
    collapsedById.value = {}
  },
)

function isCollapsed(node: TreeLayerNode): boolean {
  if (props.pinnedExpandIds?.has(node.id)) return false
  if (collapsedById.value[node.id] !== undefined) {
    return collapsedById.value[node.id]
  }
  if (!node.children?.length) return false
  return !expandAncestorIds.value.has(node.id)
}

function toggleCollapsed(node: TreeLayerNode) {
  if (props.pinnedExpandIds?.has(node.id)) {
    emit('unpin-expand', node.id)
    collapsedById.value[node.id] = true
    return
  }
  const nextCollapsed = !isCollapsed(node)
  collapsedById.value[node.id] = nextCollapsed
  if (nextCollapsed) emit('unpin-expand', node.id)
}

function rowDomId(node: TreeLayerNode): string {
  return `ec-cat-row-${catalogDomIdFromNodeId(node.id)}`
}

function isHighlighted(node: TreeLayerNode): boolean {
  return Boolean(props.highlightedNodeIds?.has(node.id))
}

watch(
  () => props.focusCatalogNodeId,
  (nodeId) => {
    if (!nodeId || (props.depth ?? 0) > 0) return
    nextTick(() => {
      document.getElementById(`ec-cat-row-${catalogDomIdFromNodeId(nodeId)}`)?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    })
  },
)

function onCheck(node: TreeLayerNode, checked: boolean) {
  emit('toggle', node.id, checked)
}

function rowInZoomRange(node: TreeLayerNode): boolean {
  return isCatalogNodeInZoomRange(node, props.mapZoom)
}

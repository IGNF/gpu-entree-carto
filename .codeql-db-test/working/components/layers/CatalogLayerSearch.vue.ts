/**
 * Recherche de couches dans le catalogue Données (résultats + lien vers l’arbre).
 */
import { computed, ref } from 'vue'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import { catalogNodesMatchingSearch } from '@/lib/layerConfig/catalogTreeSearch'
import { isCatalogNodeInZoomRange } from '@/lib/layerConfig/catalogLayerZoomRange'

const props = defineProps<{
  roots: TreeLayerNode[]
  checkedById: Record<string, boolean>
  mapZoom: number
}>()

const emit = defineEmits<{
  toggle: [id: string, checked: boolean]
  'focus-node': [id: string]
}>()

const query = ref('')

const results = computed(() => catalogNodesMatchingSearch(props.roots, query.value))

function onCheck(node: TreeLayerNode, checked: boolean) {
  emit('toggle', node.id, checked)
}

function onResultLabelClick(node: TreeLayerNode) {
  emit('focus-node', node.id)
}

function rowInZoomRange(node: TreeLayerNode): boolean {
  return isCatalogNodeInZoomRange(node, props.mapZoom)
}

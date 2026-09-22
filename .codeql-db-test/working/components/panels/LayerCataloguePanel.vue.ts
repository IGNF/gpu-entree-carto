/**
 * Onglet Catalogue — sous-onglets Données / Fonds de cartes (style barre de navigation).
 */
import { computed, ref } from 'vue'
import CatalogLayerTree from '@/components/layers/CatalogLayerTree.vue'
import CatalogLayerSearch from '@/components/layers/CatalogLayerSearch.vue'
import { buildCatalogTreeIndex, catalogAncestorIds } from '@/lib/layerConfig/catalogTreeIndex'
import BaseLayerRadioList from '@/components/layers/BaseLayerRadioList.vue'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import type { GpuBaseLayerId, GpuBaseLayerPreset } from '@/ol/gpuBaseLayerPresets'
import '@gouvfr/dsfr/dist/component/navigation/navigation.min.css'
import '@/styles/layer-catalogue.css'

const props = defineProps<{
  layerNodes: TreeLayerNode[]
  inStackById: Record<string, boolean>
  mapZoom: number
  basePresets: GpuBaseLayerPreset[]
  baseModelValue: GpuBaseLayerId
}>()

const emit = defineEmits<{
  'update:baseModelValue': [id: GpuBaseLayerId]
  'catalog-toggle': [id: string, inStack: boolean]
}>()

const catalogueTab = ref<'donnees' | 'fonds'>('donnees')

const catalogTreeIndex = computed(() => buildCatalogTreeIndex(props.layerNodes))
const pinnedExpandIds = ref<Set<string>>(new Set())
const highlightedNodeIds = ref<Set<string>>(new Set())
const focusCatalogNodeId = ref<string | null>(null)
let highlightClearTimer: ReturnType<typeof setTimeout> | undefined

function onCatalogToggle(id: string, checked: boolean) {
  emit('catalog-toggle', id, checked)
}

function onSearchFocusNode(nodeId: string) {
  const ancestors = catalogAncestorIds(nodeId, catalogTreeIndex.value.parentById)
  pinnedExpandIds.value = new Set(ancestors)
  highlightedNodeIds.value = new Set([nodeId])
  focusCatalogNodeId.value = nodeId
  clearTimeout(highlightClearTimer)
  highlightClearTimer = setTimeout(() => {
    highlightedNodeIds.value = new Set()
  }, 2600)
}

function onUnpinExpand(nodeId: string) {
  if (!pinnedExpandIds.value.has(nodeId)) return
  const next = new Set(pinnedExpandIds.value)
  next.delete(nodeId)
  pinnedExpandIds.value = next
}

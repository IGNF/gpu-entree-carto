<script setup lang="ts">
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
</script>

<template>
  <ul class="ec-catalog-tree" :class="{ 'ec-catalog-tree--nested': (depth ?? 0) > 0 }">
    <li v-for="node in displayNodes" :key="node.id" class="ec-catalog-tree__item">
      <div
        :id="rowDomId(node)"
        class="ec-catalog-tree__row"
        :class="{
          'ec-not-in-zoom-range': !rowInZoomRange(node),
          'ec-catalog-tree__row--highlight': isHighlighted(node),
        }"
        :style="{ paddingLeft: `${(depth ?? 0) * 1.25}rem` }"
      >
        <button
          v-if="node.children?.length"
          type="button"
          class="ec-catalog-tree__fold fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
          :aria-expanded="!isCollapsed(node)"
          :aria-label="isCollapsed(node) ? 'Déplier' : 'Replier'"
          @click="toggleCollapsed(node)"
        >
          <span
            :class="isCollapsed(node) ? 'fr-icon-arrow-right-s-line' : 'fr-icon-arrow-down-s-line'"
            aria-hidden="true"
          />
        </button>
        <span v-else class="ec-catalog-tree__fold-placeholder" aria-hidden="true" />

        <div class="fr-checkbox-group ec-catalog-tree__check">
          <input
            :id="`ec-cat-${node.id}`"
            type="checkbox"
            :checked="Boolean(checkedById[node.id])"
            @change="onCheck(node, ($event.target as HTMLInputElement).checked)"
          />
          <label class="fr-label" :for="`ec-cat-${node.id}`">{{ node.title }}</label>
        </div>
      </div>

      <CatalogLayerTree
        v-if="node.children?.length && !isCollapsed(node)"
        :nodes="node.children"
        :checked-by-id="checkedById"
        :map-zoom="mapZoom"
        :catalog-roots="catalogRoots ?? nodes"
        :expand-ancestor-ids="expandAncestorIds"
        :pinned-expand-ids="pinnedExpandIds"
        :highlighted-node-ids="highlightedNodeIds"
        :depth="(depth ?? 0) + 1"
        @toggle="(id, checked) => emit('toggle', id, checked)"
        @unpin-expand="(id) => emit('unpin-expand', id)"
      />
    </li>
  </ul>
</template>

<style scoped>
.ec-catalog-tree {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ec-catalog-tree--nested {
  margin-top: 0.15rem;
}

.ec-catalog-tree__item {
  margin: 0;
}

.ec-catalog-tree__row {
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 0.35rem 0;
  border-top: 1px solid var(--border-default-grey, #ddd);
}

.ec-catalog-tree__item:first-child > .ec-catalog-tree__row {
  border-top: none;
}

.ec-catalog-tree__fold,
.ec-catalog-tree__fold-placeholder {
  flex: 0 0 2rem;
  width: 2rem;
  height: 2rem;
}

.ec-catalog-tree__fold {
  padding: 0;
  min-height: 2rem;
}

.ec-catalog-tree__check {
  flex: 1 1 auto;
  margin: 0;
  min-width: 0;
}

.ec-catalog-tree__check .fr-label {
  font-size: 0.875rem;
  line-height: 1.35;
}

.ec-catalog-tree__row--highlight {
  animation: ec-catalog-tree-highlight 2.5s ease-out;
  background-color: var(--background-contrast-blue-france, #e8edff);
  border-radius: 0.25rem;
}

@keyframes ec-catalog-tree-highlight {
  0% {
    background-color: var(--background-open-blue-france, #e8edff);
  }
  100% {
    background-color: transparent;
  }
}
</style>

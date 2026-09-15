<script setup lang="ts">
/**
 * Arbre catalogue gpu-client (LAYER_CONFIG) — checkbox + titre, repliable.
 */
import { ref } from 'vue'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'

const props = defineProps<{
  nodes: TreeLayerNode[]
  checkedById: Record<string, boolean>
  depth?: number
}>()

const emit = defineEmits<{
  toggle: [id: string, checked: boolean]
}>()

const collapsedById = ref<Record<string, boolean>>({})

function isCollapsed(node: TreeLayerNode): boolean {
  if (collapsedById.value[node.id] !== undefined) {
    return collapsedById.value[node.id]
  }
  return Boolean(node.defaultCollapsed)
}

function toggleCollapsed(node: TreeLayerNode) {
  collapsedById.value[node.id] = !isCollapsed(node)
}

function onCheck(node: TreeLayerNode, checked: boolean) {
  emit('toggle', node.id, checked)
}
</script>

<template>
  <ul class="ec-catalog-tree" :class="{ 'ec-catalog-tree--nested': (depth ?? 0) > 0 }">
    <li v-for="node in nodes" :key="node.id" class="ec-catalog-tree__item">
      <div class="ec-catalog-tree__row" :style="{ paddingLeft: `${(depth ?? 0) * 1.25}rem` }">
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
        :depth="(depth ?? 0) + 1"
        @toggle="(id, checked) => emit('toggle', id, checked)"
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
</style>

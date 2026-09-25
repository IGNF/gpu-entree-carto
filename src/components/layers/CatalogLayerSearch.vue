<script setup lang="ts">
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
</script>

<template>
  <div class="ec-catalog-search" role="search">
    <div class="fr-input-group">
      <label class="fr-label" for="ec-catalog-layer-search-input"> Rechercher </label>
      <input
        id="ec-catalog-layer-search-input"
        v-model="query"
        class="fr-input"
        type="search"
        name="q"
        placeholder="Rechercher une donnée"
        aria-describedby="ec-catalog-layer-search-messages"
        autocomplete="off"
      />
      <div id="ec-catalog-layer-search-messages" class="fr-messages-group" aria-live="polite" />
    </div>

    <ul v-if="query.trim() && results.length" class="ec-catalog-search__results">
      <li v-for="node in results" :key="node.id" class="ec-catalog-search__result">
        <div
          class="ec-catalog-search__result-row"
          :class="{ 'ec-not-in-zoom-range': !rowInZoomRange(node) }"
        >
          <div class="fr-checkbox-group fr-checkbox-group--sm ec-catalog-search__check">
            <input
              :id="`ec-cat-search-${node.id}`"
              type="checkbox"
              :checked="Boolean(checkedById[node.id])"
              @change="onCheck(node, ($event.target as HTMLInputElement).checked)"
            />
            <label
              class="fr-label"
              :for="`ec-cat-search-${node.id}`"
              @click="onResultLabelClick(node)"
            >
              {{ node.title }}
            </label>
          </div>
        </div>
      </li>
    </ul>

    <p v-else-if="query.trim() && !results.length" class="ec-catalog-search__empty" role="status">
      Aucune couche ne correspond à « {{ query.trim() }} ».
    </p>
  </div>
</template>

<style scoped>
.ec-catalog-search {
  margin: 0 0 1rem;
}

.ec-catalog-search__results {
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
  max-height: 12rem;
  overflow: auto;
  border: 1px solid var(--border-default-grey, #ddd);
  border-radius: 0.25rem;
}

.ec-catalog-search__result-row {
  padding: 0.35rem 0.75rem;
  border-top: 1px solid var(--border-default-grey, #ddd);
}

.ec-catalog-search__result:first-child .ec-catalog-search__result-row {
  border-top: none;
}

/* Même disposition que `.ec-catalog-tree__check` (CatalogLayerTree) */
.ec-catalog-search__check {
  margin: 0;
  min-width: 0;
}

.ec-catalog-search__check .fr-label {
  font-size: 0.875rem;
  line-height: 1.35;
}

.ec-catalog-search__empty {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--text-mention-grey, #666);
}
</style>

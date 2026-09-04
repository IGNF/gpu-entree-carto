<script setup lang="ts">
/**
 * Arbre de couches + légende intégrée (équivalent TreeLayerSwitcher + Legend gpu-client).
 * Pour l’instant : nœuds plats / légende stub ; branchera sur layerConfig plus tard.
 */
import { computed } from 'vue'
import type { LayerTreeNode, LegendItem } from '@/types/stubs'

export interface TreeLayerNode extends LayerTreeNode {
  children?: TreeLayerNode[]
  legend?: LegendItem[]
}

const props = defineProps<{
  nodes: TreeLayerNode[]
}>()

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

function onChange(node: TreeLayerNode, checked: boolean) {
  emit('toggle', node.id, checked)
}
</script>

<template>
  <section class="ec-tree-layers" aria-label="Couches métier">
    <div class="ec-tree-layers__head">
      <h3 class="ec-tree-layers__title">Afficher</h3>
    </div>

    <ul class="ec-tree-layers__list">
      <li v-for="node in nodes" :key="node.id" class="ec-tree-layers__item">
        <div class="fr-checkbox-group">
          <input
            :id="`tls-${node.id}`"
            type="checkbox"
            :checked="node.visible"
            @change="onChange(node, ($event.target as HTMLInputElement).checked)"
          />
          <label class="fr-label" :for="`tls-${node.id}`">{{ node.title }}</label>
        </div>
        <ul v-if="node.visible && node.legend?.length" class="ec-tree-layers__legend">
          <li v-for="leg in node.legend" :key="leg.id" class="ec-tree-layers__legend-item">
            <img v-if="leg.imageUrl" class="ec-tree-layers__swatch" :src="leg.imageUrl" alt="" />
            <span
              v-else
              class="ec-tree-layers__swatch ec-tree-layers__swatch--color"
              aria-hidden="true"
            />
            <span>{{ leg.title }}</span>
          </li>
        </ul>
      </li>
    </ul>

    <p v-if="!nodes.length" class="ec-tree-layers__hint">
      Aucune couche configurée pour le moment.
    </p>

    <p v-else-if="!flatLegend.length" class="ec-tree-layers__hint">
      Activez une couche pour afficher sa légende.
    </p>
  </section>
</template>

<style scoped>
.ec-tree-layers__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.ec-tree-layers__title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.ec-tree-layers__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ec-tree-layers__item {
  margin-bottom: 0.5rem;
}

.ec-tree-layers__legend {
  margin: 0.35rem 0 0.5rem 1.75rem;
  padding: 0;
  list-style: none;
}

.ec-tree-layers__legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  font-size: 0.8125rem;
}

.ec-tree-layers__swatch {
  flex: 0 0 1.25rem;
  width: 1.25rem;
  height: 1rem;
  object-fit: contain;
}

.ec-tree-layers__swatch--color {
  background: var(--background-action-high-blue-france, #000091);
  border-radius: 2px;
  opacity: 0.55;
}

.ec-tree-layers__hint {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
  color: var(--text-mention-grey, #666);
}
</style>

<script setup lang="ts">
import type { LayerTreeNode } from '@/types/stubs'

defineProps<{
  nodes: LayerTreeNode[]
}>()

const emit = defineEmits<{
  toggle: [id: string, visible: boolean]
}>()

function onChange(id: string, event: Event) {
  const target = event.target as HTMLInputElement
  emit('toggle', id, target.checked)
}
</script>

<template>
  <section class="ec-layers-tree" aria-labelledby="ec-layers-title">
    <h2 id="ec-layers-title" class="fr-h6">
      Couches
    </h2>
    <ul class="fr-raw-list">
      <li v-for="node in nodes" :key="node.id" class="fr-checkbox-group">
        <input
          :id="`layer-${node.id}`"
          type="checkbox"
          :checked="node.visible"
          @change="onChange(node.id, $event)"
        >
        <label class="fr-label" :for="`layer-${node.id}`">
          {{ node.title }}
        </label>
      </li>
      <li v-if="nodes.length === 0" class="fr-text--sm fr-hint-text">
        Aucune couche métier (stub).
      </li>
    </ul>
  </section>
</template>

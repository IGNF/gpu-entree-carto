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
</script>

<template>
  <section
    class="ec-tree-layers"
    :aria-label="variant === 'catalog' ? 'Catalogue de données' : 'Couches métier'"
  >
    <div v-if="variant === 'full'" class="ec-tree-layers__head">
      <h3 class="ec-tree-layers__title">Afficher</h3>
    </div>

    <ul class="ec-tree-layers__list">
      <li v-for="node in nodes" :key="node.id" class="ec-tree-layers__item">
        <div class="fr-checkbox-group" :class="{ 'fr-checkbox-group--sm': variant === 'catalog' }">
          <input
            :id="`tls-${node.id}`"
            type="checkbox"
            :checked="isChecked(node)"
            @change="onChange(node, ($event.target as HTMLInputElement).checked)"
          />
          <label class="fr-label" :for="`tls-${node.id}`">{{ node.title }}</label>
        </div>
        <ul
          v-if="variant === 'full' && node.visible && node.legend?.length"
          class="ec-tree-layers__legend"
        >
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

    <p v-else-if="variant === 'full' && !flatLegend.length" class="ec-tree-layers__hint">
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

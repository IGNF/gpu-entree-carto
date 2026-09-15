<script setup lang="ts">
/**
 * Onglet Légendes — entrées des couches visibles dans la pile.
 */
import { computed } from 'vue'
import type { ManagedLayer } from '@/composables/managedLayers'
import type { LegendItem } from '@/types/stubs'

const props = defineProps<{
  layers: ManagedLayer[]
}>()

const legendItems = computed((): LegendItem[] => {
  const items: LegendItem[] = []
  for (const layer of props.layers) {
    if (layer.legend?.length) {
      items.push(...layer.legend)
    }
  }
  return items
})
</script>

<template>
  <section class="ec-layer-legends" aria-labelledby="ec-layer-legends-title">
    <h2 id="ec-layer-legends-title" class="ec-layer-legends__title">Légendes</h2>

    <p v-if="!layers.length" class="ec-layer-legends__hint">
      Ajoutez et affichez des couches depuis le catalogue pour voir leurs légendes ici.
    </p>

    <template v-else>
      <article
        v-for="layer in layers"
        :key="layer.id"
        class="ec-layer-legends__block"
      >
        <h3 class="ec-layer-legends__layer-name">{{ layer.title }}</h3>
        <ul v-if="layer.legend?.length" class="ec-layer-legends__list">
          <li v-for="leg in layer.legend" :key="leg.id" class="ec-layer-legends__item">
            <img v-if="leg.imageUrl" class="ec-layer-legends__img" :src="leg.imageUrl" alt="" />
            <span
              v-else
              class="ec-layer-legends__swatch"
              aria-hidden="true"
            />
            <span>{{ leg.title }}</span>
          </li>
        </ul>
        <p v-else class="ec-layer-legends__hint">Pas de légende pour cette couche.</p>
      </article>

      <p v-if="!legendItems.length" class="ec-layer-legends__hint">
        Aucune entrée de légende disponible pour les couches affichées.
      </p>
    </template>
  </section>
</template>

<style scoped>
.ec-layer-legends__title {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  font-weight: 700;
}

.ec-layer-legends__layer-name {
  margin: 0 0 0.5rem;
  font-size: 0.9375rem;
  font-weight: 700;
}

.ec-layer-legends__block {
  margin-bottom: 1.25rem;
}

.ec-layer-legends__block:last-child {
  margin-bottom: 0;
}

.ec-layer-legends__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ec-layer-legends__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  font-size: 0.8125rem;
}

.ec-layer-legends__swatch {
  flex: 0 0 1.25rem;
  width: 1.25rem;
  height: 1rem;
  background: var(--background-action-high-blue-france, #000091);
  border-radius: 2px;
  opacity: 0.55;
}

.ec-layer-legends__img {
  max-width: 8rem;
  height: auto;
}

.ec-layer-legends__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-mention-grey, #666);
}
</style>

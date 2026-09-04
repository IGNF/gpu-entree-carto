<script setup lang="ts">
import type { LegendItem } from '@/types/stubs'

defineProps<{
  items: LegendItem[]
}>()
</script>

<template>
  <section class="ec-legend" aria-labelledby="ec-legend-title">
    <h2 id="ec-legend-title" class="fr-h6">Légende</h2>
    <ul class="ec-legend__list fr-raw-list">
      <li v-for="item in items" :key="item.id" class="ec-legend__item">
        <img
          v-if="item.imageUrl"
          class="ec-legend__img"
          :src="item.imageUrl"
          :alt="`Légende — ${item.title}`"
        />
        <span v-else class="ec-legend__swatch" aria-hidden="true" />
        <span class="ec-legend__title">{{ item.title }}</span>
      </li>
      <li v-if="items.length === 0" class="fr-text--sm fr-hint-text">
        Aucune entrée de légende pour l’instant.
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ec-legend__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ec-legend__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ec-legend__swatch {
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid var(--border-default-grey, #ddd);
  background: var(--background-contrast-blue-france, #e3e3fd);
  flex-shrink: 0;
}

.ec-legend__img {
  max-width: 8rem;
  height: auto;
}

.ec-legend__title {
  font-size: 0.875rem;
}
</style>

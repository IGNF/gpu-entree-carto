<script setup lang="ts">
/**
 * Onglet « Couches de données » — pile des couches choisies dans le catalogue.
 */
import type { ManagedLayer } from '@/composables/managedLayers'

defineProps<{
  layers: ManagedLayer[]
}>()

const emit = defineEmits<{
  visible: [id: string, visible: boolean]
  opacity: [id: string, opacity: number]
  remove: [id: string]
  move: [id: string, direction: -1 | 1]
}>()
</script>

<template>
  <section class="ec-data-layers" aria-labelledby="ec-data-layers-title">
    <h2 id="ec-data-layers-title" class="ec-data-layers__title">Couches de données</h2>

    <p v-if="!layers.length" class="ec-data-layers__hint">
      Aucune couche dans la pile. Cochez des entrées dans l’onglet Catalogue → Données.
    </p>

    <ul v-else class="ec-data-layers__list">
      <li v-for="(layer, index) in layers" :key="layer.id" class="ec-data-layers__item">
        <div class="ec-data-layers__row ec-data-layers__row--head">
          <div class="fr-checkbox-group">
            <input
              :id="`ec-dlm-vis-${layer.id}`"
              type="checkbox"
              :checked="layer.visible"
              @change="
                emit('visible', layer.id, ($event.target as HTMLInputElement).checked)
              "
            />
            <label class="fr-label" :for="`ec-dlm-vis-${layer.id}`">{{ layer.title }}</label>
          </div>
          <div class="ec-data-layers__actions">
            <button
              type="button"
              class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
              title="Monter"
              :disabled="index === 0"
              @click="emit('move', layer.id, 1)"
            >
              <span class="fr-icon-arrow-up-s-line" aria-hidden="true" />
              <span class="fr-sr-only">Monter</span>
            </button>
            <button
              type="button"
              class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
              title="Descendre"
              :disabled="index === layers.length - 1"
              @click="emit('move', layer.id, -1)"
            >
              <span class="fr-icon-arrow-down-s-line" aria-hidden="true" />
              <span class="fr-sr-only">Descendre</span>
            </button>
            <button
              type="button"
              class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
              title="Retirer de la pile"
              @click="emit('remove', layer.id)"
            >
              <span class="fr-icon-delete-bin-line" aria-hidden="true" />
              <span class="fr-sr-only">Retirer</span>
            </button>
          </div>
        </div>
        <div class="ec-data-layers__row">
          <label class="fr-label" :for="`ec-dlm-op-${layer.id}`">Opacité</label>
          <input
            :id="`ec-dlm-op-${layer.id}`"
            type="range"
            min="0"
            max="100"
            step="5"
            :value="layer.opacity"
            @input="
              emit('opacity', layer.id, Number(($event.target as HTMLInputElement).value))
            "
          />
          <output>{{ layer.opacity }} %</output>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ec-data-layers__title {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  font-weight: 700;
}

.ec-data-layers__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-mention-grey, #666);
}

.ec-data-layers__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ec-data-layers__item {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-default-grey, #ddd);
}

.ec-data-layers__item:last-child {
  border-bottom: none;
}

.ec-data-layers__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.ec-data-layers__row--head {
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.ec-data-layers__row .fr-label {
  flex: 0 0 auto;
  margin: 0;
}

.ec-data-layers__row input[type='range'] {
  flex: 1 1 8rem;
  min-width: 6rem;
  accent-color: var(--background-action-high-blue-france, #000091);
}

.ec-data-layers__actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
</style>

<script setup lang="ts">
/**
 * Onglet « Couches de données » — pile des couches choisies dans le catalogue.
 */
import { ref } from 'vue'
import type { ManagedLayer } from '@/composables/managedLayers'
import { TAB_PANEL_IDS, tabPanelsApiRef } from '@/composables/tabPanels'
import '@/styles/data-layers.css'

defineProps<{
  layers: ManagedLayer[]
}>()

const emit = defineEmits<{
  visible: [id: string, visible: boolean]
  opacity: [id: string, opacity: number]
  'reset-opacity': [id: string]
  remove: [id: string]
  reorder: [fromDisplayIndex: number, toDisplayIndex: number]
}>()

const dragFromIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function toggleVisible(layer: ManagedLayer) {
  emit('visible', layer.id, !layer.visible)
}

function openLegendsTab() {
  tabPanelsApiRef.value?.openTab(TAB_PANEL_IDS.legends)
}

function onDragStart(event: DragEvent, index: number) {
  dragFromIndex.value = index
  dragOverIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragEnd() {
  dragFromIndex.value = null
  dragOverIndex.value = null
}

function onDragOver(index: number) {
  if (dragFromIndex.value === null) return
  dragOverIndex.value = index
}

function onDrop(toIndex: number) {
  const from = dragFromIndex.value
  if (from !== null && from !== toIndex) {
    emit('reorder', from, toIndex)
  }
  onDragEnd()
}
</script>

<template>
  <section class="ec-data-layers" aria-labelledby="ec-data-layers-title">
    <h2 id="ec-data-layers-title" class="ec-data-layers__title">
      <i class="ri-stack-line ec-data-layers__title-icon" aria-hidden="true" />
      Couches de données
    </h2>

    <p v-if="!layers.length" class="ec-data-layers__hint">
      Aucune couche dans la pile. Cochez des entrées dans l’onglet Catalogue → Données.
    </p>

    <ul v-else class="ec-data-layers__list">
      <li
        v-for="(layer, index) in layers"
        :key="layer.id"
        class="ec-data-layers__item"
        :class="{
          'ec-data-layers__item--drag-over':
            dragOverIndex === index && dragFromIndex !== null && dragFromIndex !== index,
          'ec-data-layers__item--dragging': dragFromIndex === index,
        }"
        @dragover.prevent="onDragOver(index)"
        @drop.prevent="onDrop(index)"
      >
        <div class="ec-data-layers__head">
          <p class="ec-data-layers__name">{{ layer.title }}</p>
          <div class="ec-data-layers__head-end">
            <button
              v-if="layer.legend?.length"
              type="button"
              class="ec-data-layers__legend-btn fr-btn fr-btn--sm fr-btn--secondary"
              @click="openLegendsTab"
            >
              <span class="ri-list-indefinite" aria-hidden="true" />
              Légendes
            </button>
            <button
              type="button"
              class="ec-data-layers__drag-handle"
              draggable="true"
              title="Glisser pour modifier l’ordre d’affichage"
              @dragstart="onDragStart($event, index)"
              @dragend="onDragEnd"
            >
              <i class="ri-drag-move-2-fill" aria-hidden="true" />
              <span class="fr-sr-only">Réordonner {{ layer.title }}</span>
            </button>
          </div>
        </div>

        <div class="ec-data-layers__toolbar">
          <button
            type="button"
            class="ec-data-layers__icon-btn"
            :title="layer.visible ? 'Masquer la couche' : 'Afficher la couche'"
            :aria-pressed="layer.visible"
            @click="toggleVisible(layer)"
          >
            <i
              :class="layer.visible ? 'ri-eye-line' : 'ri-eye-off-line'"
              aria-hidden="true"
            />
            <span class="fr-sr-only">
              {{ layer.visible ? 'Masquer' : 'Afficher' }} {{ layer.title }}
            </span>
          </button>

          <button
            type="button"
            class="ec-data-layers__icon-btn"
            title="Retirer de la pile"
            @click="emit('remove', layer.id)"
          >
            <i class="ri-delete-bin-line" aria-hidden="true" />
            <span class="fr-sr-only">Retirer {{ layer.title }}</span>
          </button>

          <button
            type="button"
            class="ec-data-layers__icon-btn"
            title="Rétablir le contraste par défaut"
            @click="emit('reset-opacity', layer.id)"
          >
            <i class="ri-contrast-fill" aria-hidden="true" />
            <span class="fr-sr-only">Contraste par défaut pour {{ layer.title }}</span>
          </button>

          <div class="ec-data-layers__range fr-range-group">
            <label class="fr-sr-only" :for="`ec-dlm-op-${layer.id}`">Opacité</label>
            <input
              :id="`ec-dlm-op-${layer.id}`"
              class="fr-range"
              type="range"
              min="0"
              max="100"
              step="5"
              :value="layer.opacity"
              @input="
                emit('opacity', layer.id, Number(($event.target as HTMLInputElement).value))
              "
            />
            <output class="ec-data-layers__range-value" :for="`ec-dlm-op-${layer.id}`">
              {{ layer.opacity }}&nbsp;%
            </output>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

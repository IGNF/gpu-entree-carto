<script setup lang="ts">
/**
 * Onglet « Couches de données » — pile des couches choisies dans le catalogue.
 */
import { ref } from 'vue'
import type { ManagedLayer } from '@/composables/managedLayers'
import { tabPanelsApiRef } from '@/composables/tabPanels'
import '@/styles/data-layers.css'

const props = defineProps<{
  layers: ManagedLayer[]
  mapZoom: number
  catalogEntryInZoomRange: (id: string, zoom: number) => boolean
}>()

function layerInZoomRange(layer: ManagedLayer): boolean {
  return props.catalogEntryInZoomRange(layer.id, props.mapZoom)
}

const emit = defineEmits<{
  visible: [id: string, visible: boolean]
  opacity: [id: string, opacity: number]
  'toggle-grayscale': [id: string]
  remove: [id: string]
  reorder: [fromDisplayIndex: number, toInsertBefore: number]
}>()

const dragLayerId = ref<string | null>(null)
const dragInsertIndex = ref<number | null>(null)
let dropCommitted = false

function toggleVisible(layer: ManagedLayer) {
  emit('visible', layer.id, !layer.visible)
}

function openLegendsForLayer(layer: ManagedLayer) {
  tabPanelsApiRef.value?.openLegendForLayer(layer.id)
}

function onDragStart(event: DragEvent, index: number) {
  const layer = props.layers[index]
  if (!layer) return
  dropCommitted = false
  dragLayerId.value = layer.id
  dragInsertIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', layer.id)
    if (event.target instanceof HTMLElement) {
      event.dataTransfer.setDragImage(event.target, 12, 12)
    }
  }
}

function clearDragState() {
  dragLayerId.value = null
  dragInsertIndex.value = null
}

function onDragEnd() {
  window.setTimeout(() => {
    if (!dropCommitted) clearDragState()
    dropCommitted = false
  }, 0)
}

function insertIndexFromPointer(event: DragEvent, index: number, layerCount: number): number {
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const mid = rect.top + rect.height / 2
  const before = event.clientY < mid ? index : index + 1
  return Math.min(Math.max(0, before), layerCount)
}

function onItemDragOver(event: DragEvent, index: number) {
  if (!dragLayerId.value) return
  event.preventDefault()
  event.stopPropagation()
  dragInsertIndex.value = insertIndexFromPointer(event, index, props.layers.length)
}

function onListDragOver(event: DragEvent) {
  if (!dragLayerId.value) return
  event.preventDefault()
}

function onTailDragOver(event: DragEvent) {
  if (!dragLayerId.value) return
  event.preventDefault()
  event.stopPropagation()
  dragInsertIndex.value = props.layers.length
}

function onDrop() {
  const fromIndex = props.layers.findIndex((l) => l.id === dragLayerId.value)
  const toInsertBefore = dragInsertIndex.value
  if (fromIndex >= 0 && toInsertBefore !== null) {
    emit('reorder', fromIndex, toInsertBefore)
    dropCommitted = true
  }
  clearDragState()
}

function dragFromIndex(): number | null {
  if (!dragLayerId.value) return null
  const i = props.layers.findIndex((l) => l.id === dragLayerId.value)
  return i >= 0 ? i : null
}

function showDropMarkerBefore(index: number): boolean {
  const from = dragFromIndex()
  return from !== null && dragInsertIndex.value === index
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

    <ul
      v-else
      class="ec-data-layers__list"
      @dragover="onListDragOver"
      @drop.prevent="onDrop"
    >
      <template v-for="(layer, index) in layers" :key="layer.id">
        <li
          v-if="showDropMarkerBefore(index)"
          class="ec-data-layers__drop-marker"
          aria-hidden="true"
        />
        <li
          class="ec-data-layers__item"
          :class="{
            'ec-data-layers__item--dragging': dragFromIndex() === index,
            'ec-not-in-zoom-range': !layerInZoomRange(layer),
          }"
          @dragover="onItemDragOver($event, index)"
          @drop.prevent="onDrop"
        >
          <div class="ec-data-layers__head">
            <p class="ec-data-layers__name">{{ layer.title }}</p>
            <div class="ec-data-layers__head-end">
              <button
                v-if="layer.legend?.length"
                type="button"
                class="ec-data-layers__legend-btn fr-btn fr-btn--sm fr-btn--secondary"
                @click="openLegendsForLayer(layer)"
              >
                <i class="ri-list-indefinite ec-data-layers__legend-icon" aria-hidden="true" />
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
              :class="{ 'ec-data-layers__icon-btn--active': layer.grayscale }"
              :title="
                layer.grayscale
                  ? 'Afficher en couleurs'
                  : 'Afficher en niveaux de gris'
              "
              :aria-pressed="layer.grayscale"
              @click="emit('toggle-grayscale', layer.id)"
            >
              <i class="ri-contrast-fill" aria-hidden="true" />
              <span class="fr-sr-only">
                {{
                  layer.grayscale ? 'Couleurs' : 'Niveaux de gris'
                }}
                — {{ layer.title }}
              </span>
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
                :disabled="layer.forceOpacity"
                :title="layer.forceOpacity ? 'Opacité fixée par la configuration' : undefined"
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
      </template>
      <li
        v-if="dragLayerId && dragInsertIndex === layers.length"
        class="ec-data-layers__drop-marker"
        aria-hidden="true"
      />
      <li
        v-if="dragLayerId"
        class="ec-data-layers__drop-tail"
        aria-hidden="true"
        @dragover="onTailDragOver"
        @drop.prevent="onDrop"
      />
    </ul>
  </section>
</template>

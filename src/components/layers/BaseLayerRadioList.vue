<script setup lang="ts">
/**
 * Fonds de cartes — liste verticale type gpu-site (panneau Catalogue).
 */
import { reactive } from 'vue'
import type { GpuBaseLayerId, GpuBaseLayerPreset } from '@/ol/gpuBaseLayerPresets'
import {
  filterThumbnailLayersAtPreviewZoom,
  wmtsPreviewTileUrl,
} from '@/ol/gpuBaseLayerThumbnails'
import '@/styles/base-layer-radio-list.css'

function previewLayers(preset: GpuBaseLayerPreset) {
  return filterThumbnailLayersAtPreviewZoom(preset.thumbnailLayers)
}

defineProps<{
  presets: GpuBaseLayerPreset[]
  modelValue: GpuBaseLayerId
}>()

const emit = defineEmits<{
  'update:modelValue': [id: GpuBaseLayerId]
}>()

const openDescriptions = reactive<Record<string, boolean>>({})

function isDescriptionOpen(id: GpuBaseLayerId): boolean {
  return openDescriptions[id] === true
}

function toggleDescription(id: GpuBaseLayerId) {
  openDescriptions[id] = !openDescriptions[id]
}

function select(id: GpuBaseLayerId) {
  emit('update:modelValue', id)
}
</script>

<template>
  <section class="ec-base-radio-list" aria-label="Fonds de cartes">
    <ul class="ec-base-radio-list__list">
      <li v-for="preset in presets" :key="preset.id" class="ec-base-radio-list__item">
        <div class="ec-base-radio-list__grid">
          <div class="ec-base-radio-list__radio-slot">
            <label class="ec-base-radio" :for="`ec-base-${preset.id}`">
              <input
                :id="`ec-base-${preset.id}`"
                type="radio"
                class="ec-base-radio__input"
                name="ec-base-layer"
                :value="preset.id"
                :checked="modelValue === preset.id"
                @change="select(preset.id)"
              />
              <span class="ec-base-radio__ring" aria-hidden="true" />
              <span class="fr-sr-only">{{ preset.label }}</span>
            </label>
          </div>

          <div class="ec-base-radio-list__thumb-slot">
            <button
              type="button"
              class="ec-base-radio-list__thumb-btn"
              :aria-label="`Sélectionner ${preset.label}`"
              @click="select(preset.id)"
            >
              <span
                v-if="previewLayers(preset).length"
                class="ec-base-radio-list__thumb-stack"
              >
                <img
                  v-for="(thumb, thumbIndex) in previewLayers(preset)"
                  :key="`${preset.id}-${thumbIndex}-${thumb.layer}`"
                  class="ec-base-radio-list__thumb-layer"
                  :class="{ 'ec-base-radio-list__thumb-layer--grayscale': thumb.grayscale }"
                  :src="wmtsPreviewTileUrl(thumb)"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span v-else class="ec-base-radio-list__thumb ec-base-radio-list__thumb--blank" />
            </button>
          </div>

          <div class="ec-base-radio-list__title-slot">
            <button type="button" class="ec-base-radio-list__title" @click="select(preset.id)">
              {{ preset.label }}
            </button>
          </div>

          <div class="ec-base-radio-list__caret-slot">
            <button
              type="button"
              class="ec-base-radio-list__caret fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
              :aria-expanded="isDescriptionOpen(preset.id)"
              :aria-controls="`ec-base-desc-${preset.id}`"
              :aria-label="
                isDescriptionOpen(preset.id)
                  ? `Masquer la description de ${preset.label}`
                  : `Afficher la description de ${preset.label}`
              "
              @click="toggleDescription(preset.id)"
            >
              <span
                class="fr-icon"
                :class="
                  isDescriptionOpen(preset.id)
                    ? 'fr-icon-arrow-up-s-line'
                    : 'fr-icon-arrow-down-s-line'
                "
                aria-hidden="true"
              />
            </button>
          </div>

          <div
            v-if="isDescriptionOpen(preset.id)"
            :id="`ec-base-desc-${preset.id}`"
            class="ec-base-radio-list__details-slot"
          >
            <p class="ec-base-radio-list__subtitle">{{ preset.subtitle }}</p>
            <div class="ec-base-radio-list__desc" v-html="preset.description" />
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ec-base-radio-list__title {
  margin: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-weight: 700;
  text-align: left;
  color: var(--text-title-grey, #161616);
}

.ec-base-radio-list__thumb-btn {
  display: block;
  cursor: pointer;
}

.ec-base-radio-list__caret .fr-icon {
  --icon-size: 1rem;
}
</style>

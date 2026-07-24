<script setup lang="ts">
/**
 * Sélecteur de fonds de plan en tuiles (équivalent TileLayerSwitcherControl gpu-client).
 */
import type { BaseLayerId, BaseLayerPreset } from '@/ol/baseLayers'
import { setActiveBaseLayer } from '@/ol/baseLayers'

const props = defineProps<{
  presets: BaseLayerPreset[]
  modelValue: BaseLayerId
}>()

const emit = defineEmits<{
  'update:modelValue': [id: BaseLayerId]
}>()

function select(id: BaseLayerId) {
  setActiveBaseLayer(props.presets, id)
  emit('update:modelValue', id)
}

function thumbClass(id: BaseLayerId): string {
  return `ec-tile-switcher__thumb ec-tile-switcher__thumb--${id}`
}
</script>

<template>
  <section class="ec-tile-switcher" aria-label="Fonds de plan">
    <h3 class="ec-tile-switcher__title">Fonds de plan</h3>
    <ul class="ec-tile-switcher__list">
      <li
        v-for="preset in presets"
        :key="preset.id"
      >
        <button
          type="button"
          class="ec-tile-switcher__tile"
          :class="{ 'is-active': modelValue === preset.id }"
          :aria-pressed="modelValue === preset.id"
          @click="select(preset.id)"
        >
          <span
            :class="thumbClass(preset.id)"
            aria-hidden="true"
          />
          <span class="ec-tile-switcher__label">{{ preset.label }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ec-tile-switcher {
  margin: 0 0 1.25rem;
}

.ec-tile-switcher__title {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.ec-tile-switcher__list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ec-tile-switcher__tile {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 0.25rem;
  background: var(--background-default-grey, #fff);
  cursor: pointer;
  overflow: hidden;
}

.ec-tile-switcher__tile:hover {
  border-color: var(--border-action-high-blue-france, #000091);
}

.ec-tile-switcher__tile.is-active {
  border-color: var(--border-action-high-blue-france, #000091);
  box-shadow: 0 0 0 1px var(--border-action-high-blue-france, #000091);
}

.ec-tile-switcher__thumb {
  display: block;
  aspect-ratio: 1.4;
  background-size: cover;
  background-position: center;
}

.ec-tile-switcher__thumb--plan {
  background-color: #d8e4f0;
  background-image: linear-gradient(135deg, #c5d4e8 25%, #e8eef5 25%, #e8eef5 50%, #c5d4e8 50%, #c5d4e8 75%, #e8eef5 75%);
  background-size: 12px 12px;
}

.ec-tile-switcher__thumb--ortho {
  background: linear-gradient(160deg, #3a5a40 0%, #8fbc8f 45%, #2f4f2f 100%);
}

.ec-tile-switcher__thumb--blank {
  background: #fff;
  box-shadow: inset 0 0 0 1px var(--border-default-grey, #ddd);
}

.ec-tile-switcher__label {
  padding: 0.35rem 0.25rem;
  font-size: 0.75rem;
  line-height: 1.2;
  text-align: center;
  color: var(--text-default-grey, #161616);
}
</style>

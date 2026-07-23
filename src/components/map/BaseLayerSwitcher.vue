<script setup lang="ts">
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
</script>

<template>
  <fieldset class="fr-fieldset ec-base-layers">
    <legend class="fr-fieldset__legend fr-text--sm">Fond de plan</legend>
    <div class="fr-fieldset__content">
      <div
        v-for="preset in presets"
        :key="preset.id"
        class="fr-radio-group"
      >
        <input
          :id="`base-layer-${preset.id}`"
          type="radio"
          :name="'base-layer'"
          :value="preset.id"
          :checked="modelValue === preset.id"
          @change="select(preset.id)"
        >
        <label class="fr-label" :for="`base-layer-${preset.id}`">
          {{ preset.label }}
        </label>
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.ec-base-layers {
  margin: 0 0 1rem;
}
</style>

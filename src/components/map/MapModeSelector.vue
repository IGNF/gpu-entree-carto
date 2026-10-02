<script setup lang="ts">
/**
 * Sélecteur Parcelle / Territoire (gpu-client : mode=1|2).
 * Placement : à droite du SearchEngine (voir map-mode-selector.css).
 */
import { computed, inject, nextTick, ref, shallowRef, watch, type ShallowRef } from 'vue'
import type Map from 'ol/Map'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import { tryUseMapMode } from '@/composables/mapMode'
import { focusModeEmpriseOnMap } from '@/lib/map/focusModeEmprise'
import { getMapPermalinkParams, readMapPermalinkMarker } from '@/lib/map/mapPermalink'
import { readCherryOrModeEmprisePoint } from '@/lib/map/searchResultGraphics'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@/assets/custom-icons/custom-remix-icons.css'

const props = withDefaults(
  defineProps<{
    modelValue?: MapModeId
  }>(),
  {
    modelValue: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [MapModeId]
}>()

const injected = tryUseMapMode()

const mode = computed<MapModeId>({
  get() {
    return props.modelValue ?? injected?.mode.value ?? MAP_MODE_TERRITORY
  },
  set(next: MapModeId) {
    if (injected) injected.setMode(next)
    emit('update:modelValue', next)
  },
})

const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))

/** Même couche que les contrôles OL (SearchEngine, onglets) — pas sous `.ol-viewport`. */
const overlayStopTarget = ref<HTMLElement | null>(null)

watch(
  mapRef,
  async (map) => {
    overlayStopTarget.value = null
    if (!map) return
    await nextTick()
    overlayStopTarget.value =
      map.getTargetElement()?.querySelector<HTMLElement>('.ol-overlaycontainer-stopevent') ?? null
  },
  { immediate: true },
)

watch(
  () => mode.value,
  async (next, previous) => {
    if (previous === undefined || next === previous) return
    const marker = readMapPermalinkMarker(getMapPermalinkParams()) ?? readCherryOrModeEmprisePoint()
    if (!marker) return
    const map = mapRef.value
    if (!map) return
    await focusModeEmpriseOnMap(map, next)
  },
)
</script>

<template>
  <Teleport :to="overlayStopTarget" :disabled="!overlayStopTarget">
    <div
      class="ec-map-mode-selector"
      role="radiogroup"
      aria-label="Mode Parcelle ou Territoire"
      data-testid="map-mode-selector"
    >
      <div class="ec-map-mode-selector__options">
        <label
          class="ec-map-mode-selector__option"
          :class="{ 'is-selected': mode === MAP_MODE_PARCEL }"
        >
          <input
            v-model="mode"
            class="ec-map-mode-selector__input"
            type="radio"
            name="ec-map-mode"
            :value="MAP_MODE_PARCEL"
          />
          <i class="ec-map-mode-selector__icon ec-icon-parcelle" aria-hidden="true" />
          <span class="ec-map-mode-selector__text">Parcelle</span>
        </label>

        <label
          class="ec-map-mode-selector__option"
          :class="{ 'is-selected': mode === MAP_MODE_TERRITORY }"
        >
          <input
            v-model="mode"
            class="ec-map-mode-selector__input"
            type="radio"
            name="ec-map-mode"
            :value="MAP_MODE_TERRITORY"
          />
          <span class="ec-map-mode-selector__icon fr-icon fr-icon-france-fill" aria-hidden="true" />
          <span class="ec-map-mode-selector__text">Territoire</span>
        </label>
      </div>
    </div>
  </Teleport>
</template>

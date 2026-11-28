<script setup lang="ts">
/**
 * Sélecteur Coordonnées / Parcelle / Territoire (gpu-client : mode=1|2 ; 3 = Coordonnées), limité aux
 * modes activés par la config (`modes`).
 * Placement : à droite du SearchEngine (voir map-mode-selector.css).
 */
import { computed, inject, nextTick, ref, shallowRef, watch, type ShallowRef } from 'vue'
import type Map from 'ol/Map'
import {
  ALL_MAP_MODES,
  MAP_MODE_COORDINATES,
  MAP_MODE_PARCEL,
  MAP_MODE_TERRITORY,
  type MapModeId,
} from '@/lib/map/mapMode'
import { tryUseMapMode } from '@/composables/mapMode'
import { focusModeEmpriseOnMap } from '@/lib/map/focusModeEmprise'
import { getMapPermalinkParams, readMapPermalinkMarker } from '@/lib/map/mapPermalink'
import { readCherryOrModeEmprisePoint } from '@/lib/map/searchResultGraphics'
import '@/assets/custom-icons/custom-remix-icons.css'

/** Clés : identifiants de mode (1 Parcelle, 2 Territoire, 3 Coordonnées). */
const MODE_LABELS: Record<MapModeId, string> = { 1: 'Parcelle', 2: 'Territoire', 3: 'Coordonnées' }

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
/** Modes activés par la config (tous sans contexte). */
const modes = computed(() => injected?.modes ?? ALL_MAP_MODES)
const ariaLabel = computed(
  () =>
    `Mode ${modes.value
      .map((m) => MODE_LABELS[m])
      .join(', ')
      .replace(/, ([^,]*)$/, ' ou $1')}`,
)

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
    // Pas de recentrage automatique : seuls les tags de la fiche recentrent la vue.
    await focusModeEmpriseOnMap(map, next, { skipFit: true })
  },
)
</script>

<template>
  <!-- Un seul mode activé : rien à choisir. -->
  <Teleport v-if="modes.length > 1" :to="overlayStopTarget" :disabled="!overlayStopTarget">
    <div
      class="ec-map-mode-selector"
      role="radiogroup"
      :aria-label="ariaLabel"
      data-testid="map-mode-selector"
    >
      <div class="ec-map-mode-selector__options">
        <label
          v-if="modes.includes(MAP_MODE_COORDINATES)"
          class="ec-map-mode-selector__option"
          :class="{ 'is-selected': mode === MAP_MODE_COORDINATES }"
        >
          <input
            v-model="mode"
            class="ec-map-mode-selector__input"
            type="radio"
            name="ec-map-mode"
            :value="MAP_MODE_COORDINATES"
          />
          <span
            class="ec-map-mode-selector__icon fr-icon fr-icon-map-pin-2-line"
            aria-hidden="true"
          />
          <span class="ec-map-mode-selector__text">Coordonnées</span>
        </label>

        <label
          v-if="modes.includes(MAP_MODE_PARCEL)"
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
          v-if="modes.includes(MAP_MODE_TERRITORY)"
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

<script setup lang="ts">
/**
 * Recherche de lieu autonome (hors carte) — remplace le form gazetteer gpu-site.
 * Autocomplétion Géoplateforme ; à la sélection : callback et/ou redirection /map/.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Geocode from '@/lib/services/Geocode'
import LocateControl from '@/lib/control/LocateControl'
import { redirectToMapWithLocation, type LocationRedirectParams } from '@/lib/search/locationSearch'
import type { AutocompleteLocation } from '@/lib/types'

const props = withDefaults(
  defineProps<{
    label?: string
    placeholder?: string
    /** Mode : redirect vers la carte, ou emit seul. */
    mode?: 'redirect' | 'emit'
    mapUrl?: string
    method?: 'GET' | 'POST'
    maximumResponses?: number
    debounceMs?: number
    initialQuery?: string
  }>(),
  {
    label: 'Rechercher par lieu:',
    placeholder: 'Rechercher une adresse, une ville, un lieu...',
    mode: 'redirect',
    mapUrl: '/map/',
    method: 'POST',
    maximumResponses: 10,
    debounceMs: 300,
    initialQuery: '',
  },
)

const emit = defineEmits<{
  select: [location: AutocompleteLocation]
}>()

const query = ref(props.initialQuery)
const suggestions = ref<AutocompleteLocation[]>([])
const open = ref(false)
const loading = ref(false)
const activeIndex = ref(-1)
const inputId = `ec-location-search-${Math.random().toString(36).slice(2, 9)}`

const geocode = new Geocode({ maximumResponses: props.maximumResponses })
const locate = new LocateControl()
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let requestSeq = 0

const listId = computed(() => `${inputId}-list`)

watch(
  () => props.initialQuery,
  (value) => {
    if (value && !query.value) query.value = value
  },
)

function clearSuggestions() {
  suggestions.value = []
  open.value = false
  activeIndex.value = -1
}

function scheduleSearch(value: string) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => runSearch(value), props.debounceMs)
}

function runSearch(value: string) {
  const trimmed = value.trim()
  if (trimmed.length < 3) {
    clearSuggestions()
    loading.value = false
    return
  }

  const seq = ++requestSeq
  loading.value = true
  geocode.autoComplete(
    trimmed,
    (response) => {
      if (seq !== requestSeq) return
      loading.value = false
      suggestions.value = (response.suggestedLocations ?? [])
        .filter((loc) => locate.isAllowedResult(loc))
        .map((loc) => ({
          ...loc,
          fullText: locate.getTextFromAutocompleteResult(loc),
        }))
        .slice(0, props.maximumResponses)
      open.value = suggestions.value.length > 0
      activeIndex.value = suggestions.value.length ? 0 : -1
    },
    () => {
      if (seq !== requestSeq) return
      loading.value = false
      clearSuggestions()
    },
    { maximumResponses: props.maximumResponses },
  )
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  query.value = value
  scheduleSearch(value)
}

function selectLocation(location: AutocompleteLocation) {
  query.value = location.fullText
  clearSuggestions()
  emit('select', location)
  if (props.mode === 'redirect') {
    redirectToMapWithLocation(location, {
      mapUrl: props.mapUrl,
      method: props.method,
    })
  }
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value || !suggestions.value.length) {
    if (event.key === 'Escape') clearSuggestions()
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value =
      (activeIndex.value - 1 + suggestions.value.length) % suggestions.value.length
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const chosen = suggestions.value[activeIndex.value]
    if (chosen) selectLocation(chosen)
  } else if (event.key === 'Escape') {
    clearSuggestions()
  }
}

function onBlur() {
  // Laisse le clic suggestion se déclencher avant fermeture.
  setTimeout(() => clearSuggestions(), 150)
}

function onSubmit(event: Event) {
  event.preventDefault()
  const chosen = suggestions.value[activeIndex.value] ?? suggestions.value[0]
  if (chosen) selectLocation(chosen)
}

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

defineExpose({
  /** Params au format formulaire gpu-site (tests / intégration). */
  toFormParams(location: AutocompleteLocation): LocationRedirectParams {
    return {
      municipality: location.fullText,
      position_x: String(location.position.x),
      position_y: String(location.position.y),
      type: location.type ?? '',
    }
  },
})
</script>

<template>
  <form class="ec-location-search" role="search" @submit="onSubmit">
    <label v-if="label" class="fr-label" :for="inputId">{{ label }}</label>
    <div class="fr-search-bar" role="search">
      <input
        :id="inputId"
        class="fr-input"
        type="search"
        name="municipality"
        :placeholder="placeholder"
        :title="placeholder"
        :value="query"
        :aria-controls="listId"
        :aria-expanded="open"
        :aria-activedescendant="activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined"
        aria-autocomplete="list"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        @input="onInput"
        @keydown="onKeydown"
        @blur="onBlur"
        @focus="suggestions.length && (open = true)"
      />
      <button class="fr-btn" type="submit" title="Rechercher" :disabled="loading">
        <span class="fr-sr-only">Rechercher</span>
      </button>
    </div>
    <ul
      v-show="open && suggestions.length"
      :id="listId"
      class="ec-location-search__suggestions"
      role="listbox"
      :aria-label="label || 'Suggestions'"
    >
      <li
        v-for="(item, index) in suggestions"
        :id="`${listId}-opt-${index}`"
        :key="`${item.fullText}-${item.position.x}-${item.position.y}-${index}`"
        role="option"
        :aria-selected="index === activeIndex"
        class="ec-location-search__suggestion"
        :class="{ 'ec-location-search__suggestion--active': index === activeIndex }"
        @mousedown.prevent="selectLocation(item)"
      >
        {{ item.fullText }}
      </li>
    </ul>
  </form>
</template>

<style scoped>
.ec-location-search {
  position: relative;
  width: 100%;
}

.ec-location-search__suggestions {
  position: absolute;
  z-index: 10;
  left: 0;
  right: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--background-default-grey, #fff);
  border: 1px solid var(--border-default-grey, #ddd);
  max-height: 16rem;
  overflow: auto;
}

.ec-location-search__suggestion {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}

.ec-location-search__suggestion--active,
.ec-location-search__suggestion:hover {
  background: var(--background-alt-blue-france, #e8edff);
}
</style>

<script setup lang="ts">
/**
 * Accueil démo (bandeau gpu-site) — SearchEngine geopf par défaut (visuel gpu-site).
 * Fallback autocomplete : `home.searchWidget: 'location'` dans demo-config.
 * `useMinimified: true` → bundles `dist/*.min.js` + `dist/css/*.min.css`.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import GpuHomeBanner from '@/components/home/GpuHomeBanner.vue'
import LocationSearchWidget from '@/components/search/LocationSearchWidget.vue'
import { mountSearchEngine, type MountedSearchEngine } from '@/lib/mountSearchEngine'
import type { MountedLocationSearch } from '@/lib/mountLocationSearch'
import {
  demoUsesMinifiedAssets,
  getMountLocationSearchFromBundle,
  getMountSearchEngineFromBundle,
  loadLibBundle,
} from '@/lib/demo/demoLibAssets'
import { prepareLocationHandoff } from '@/lib/search/locationSearch'
import type { AutocompleteLocation } from '@/lib/types'
import { getDemoConfig } from '@/lib/demo/demoConfig'
import '@/styles/gpu-home-banner.css'

const router = useRouter()
const demo = computed(() => getDemoConfig())
const useSearchEngine = computed(() => demo.value.home?.searchWidget !== 'location')
const useMinified = computed(() => demoUsesMinifiedAssets(demo.value))

const searchPlaceholder = computed(
  () => demo.value.home?.searchPlaceholder ?? 'Rechercher une adresse, une ville, un lieu...',
)

const searchHost = ref<HTMLElement | null>(null)
let mountedEngine: MountedSearchEngine | null = null
let mountedLocation: MountedLocationSearch | null = null

function onLocationSelect(location: AutocompleteLocation) {
  prepareLocationHandoff(location)
  void router.push({ name: 'map' })
}

function destroyHomeSearch() {
  mountedEngine?.destroy()
  mountedEngine = null
  mountedLocation?.destroy()
  mountedLocation = null
  if (searchHost.value) {
    searchHost.value.innerHTML = ''
  }
}

async function mountHomeSearchEngine() {
  if (!useSearchEngine.value) return
  await nextTick()
  if (!searchHost.value) return

  if (useMinified.value) {
    await loadLibBundle('entree-carto-search-engine')
    mountedEngine = getMountSearchEngineFromBundle()(searchHost.value, {
      mode: 'emit',
      placeholder: searchPlaceholder.value,
      onSelect: onLocationSelect,
    })
    return
  }

  await import('@/lib/search/searchEngineHomeStyles')
  mountedEngine = mountSearchEngine(searchHost.value, {
    mode: 'emit',
    placeholder: searchPlaceholder.value,
    onSelect: onLocationSelect,
  })
}

async function mountHomeLocationSearch() {
  if (useSearchEngine.value || !useMinified.value) return
  await nextTick()
  if (!searchHost.value) return
  await loadLibBundle('entree-carto-location-search')
  mountedLocation = getMountLocationSearchFromBundle()(searchHost.value, {
    label: '',
    mode: 'emit',
    placeholder: searchPlaceholder.value,
    onSelect: onLocationSelect,
  })
}

async function remountHomeSearch() {
  destroyHomeSearch()
  if (useSearchEngine.value) {
    await mountHomeSearchEngine()
  } else if (useMinified.value) {
    await mountHomeLocationSearch()
  }
}

onMounted(() => {
  void remountHomeSearch()
})

watch([useSearchEngine, useMinified], () => {
  void remountHomeSearch()
})

watch(searchPlaceholder, () => {
  void remountHomeSearch()
})

onBeforeUnmount(() => {
  destroyHomeSearch()
})
</script>

<template>
  <div class="ec-home ec-home--gpu-banner">
    <GpuHomeBanner>
      <div
        id="gpu-location-search"
        ref="searchHost"
        class="ec-home__search-host ec-demo-location-search"
        :class="useSearchEngine ? 'ec-home__search-engine-host' : 'ec-home__location-widget'"
      >
        <LocationSearchWidget
          v-if="!useSearchEngine && !useMinified"
          label=""
          mode="emit"
          :placeholder="searchPlaceholder"
          @select="onLocationSelect"
        />
      </div>
    </GpuHomeBanner>

    <div class="fr-container fr-py-6w ec-home__below-banner">
      <h2 class="fr-h3">Démonstration entree-carto</h2>
      <p class="fr-text">
        Cette page reproduit le bandeau d’accueil du Géoportail de l’urbanisme. Utilisez la
        recherche ci-dessus ou le menu <strong>Carte</strong> pour accéder à la carte.
      </p>
      <p v-if="useMinified" class="fr-text--sm fr-mt-2w">
        Assets : bundles <code>dist/</code> minifiés (<code>useMinimified: true</code>).
      </p>
      <p v-else-if="useSearchEngine" class="fr-text--sm fr-mt-2w">
        Widget actif : SearchEngine geopf (<code>home.searchWidget: 'search-engine'</code>).
      </p>
      <p v-else class="fr-text--sm fr-mt-2w">
        Widget actif : autocomplete léger (<code>home.searchWidget: 'location'</code>).
      </p>
    </div>
  </div>
</template>

<style scoped>
.ec-home {
  flex: 1;
  min-height: 0;
}

.ec-home__search-host {
  width: 100%;
}

.ec-home__location-widget :deep(.ec-location-search__suggestions) {
  z-index: 1000;
  margin-top: 0.25rem;
  box-shadow: 0 2px 6px 0 rgba(0, 0, 18, 0.16);
}
</style>

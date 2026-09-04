<script setup lang="ts">
/**
 * Page d’accueil démo (équivalent banner gpu-site) :
 * SearchEngineAdvanced hors carte → /map via handoff mémoire + router (SPA).
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { mountSearchEngine, type MountedSearchEngine } from '@/lib/mountSearchEngine'
import { prepareLocationHandoff } from '@/lib/search/locationSearch'
import type { AutocompleteLocation } from '@/lib/types'

const router = useRouter()
const searchHost = ref<HTMLElement | null>(null)
let mounted: MountedSearchEngine | null = null

onMounted(() => {
  if (!searchHost.value) return
  mounted = mountSearchEngine(searchHost.value, {
    mode: 'emit',
    placeholder: 'Rechercher une adresse, une ville, un lieu...',
    onSelect: (location: AutocompleteLocation) => {
      prepareLocationHandoff(location)
      void router.push({ name: 'map' })
    },
  })
})

onBeforeUnmount(() => {
  mounted?.destroy()
  mounted = null
})
</script>

<template>
  <div class="ec-home">
    <div class="ec-home__banner fr-background-alt--blue-france">
      <div class="fr-container fr-py-8v">
        <div class="fr-grid-row fr-grid-row--center fr-grid-row--middle fr-p-4w">
          <div class="fr-col-12 fr-col-lg-6">
            <p class="ec-home__banner-lead fr-text--lead">Rechercher par lieu</p>
            <p class="ec-home__banner-hint fr-text--sm">
              Même contrôle que sur la carte (recherche avancée incluse). La validation ouvre la
              démonstration cartographique centrée sur le résultat.
            </p>
            <div id="ec-demo-location-search" ref="searchHost" class="ec-home__search" />
          </div>
          <div class="fr-col-12 fr-col-lg-5 fr-col-offset-lg-1 fr-mt-4w fr-mt-lg-0">
            <ul class="fr-btns-group fr-btns-group--sm">
              <li>
                <RouterLink class="fr-btn" to="/map"> Ouvrir la carte </RouterLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="fr-container fr-py-6w">
      <h1 class="fr-h3">Démonstration entree-carto</h1>
      <p class="fr-text">
        Cette page simule le bandeau d’accueil de gpu-site. Utilisez la recherche ci-dessus ou le
        menu <strong>Carte</strong> pour accéder à la carte.
      </p>
    </div>
  </div>
</template>

<style scoped>
.ec-home {
  flex: 1;
  min-height: 0;
}

.ec-home__banner-lead,
.ec-home__banner-hint {
  color: var(--text-inverted-blue-france, #fff);
}

.ec-home__banner-lead {
  margin: 0 0 0.5rem;
  font-weight: 700;
}

.ec-home__banner-hint {
  margin: 0 0 1rem;
  opacity: 0.9;
}

.ec-home__banner {
  overflow: visible;
  position: relative;
  z-index: 2;
}

.ec-home__banner :deep(.fr-container),
.ec-home__banner :deep(.fr-grid-row),
.ec-home__banner :deep([class*='fr-col-']) {
  overflow: visible;
}

.ec-home__search {
  width: 100%;
  position: relative;
  z-index: 5;
  overflow: visible;
}
</style>

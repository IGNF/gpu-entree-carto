<script setup lang="ts">
/**
 * En-tête démo façon gpu-site : logo RF + service + nav Accueil / Carte.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const links = [
  { name: 'home', to: '/', label: 'Accueil' },
  { name: 'map', to: '/map', label: 'Carte' },
  { name: 'geometry-editor', to: '/geometry-editor', label: 'Géométries' },
  { name: 'sketch', to: '/sketch', label: 'Croquis' },
] as const

const isActive = computed(() => (name: string) => {
  return route.name === name
})
</script>

<template>
  <header
    role="banner"
    class="fr-header ec-demo-header"
  >
    <div class="fr-header__body">
      <div class="fr-container">
        <div class="fr-header__body-row">
          <div class="fr-header__brand fr-enlarge-link">
            <div class="fr-header__brand-top">
              <div class="fr-header__logo">
                <p class="fr-logo">
                  République<br>Française
                </p>
              </div>
            </div>
            <div class="fr-header__service">
              <RouterLink
                to="/"
                title="Accueil - entree-carto"
              >
                <p class="fr-header__service-title">
                  entree-carto
                </p>
              </RouterLink>
              <p class="fr-header__service-tagline">
                Démonstration — refonte GPU / DSFR
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="fr-header__menu">
      <div class="fr-container">
        <nav
          class="fr-nav"
          id="ec-demo-navigation"
          role="navigation"
          aria-label="Menu principal"
        >
          <ul class="fr-nav__list">
            <li
              v-for="link in links"
              :key="link.name"
              class="fr-nav__item"
            >
              <RouterLink
                class="fr-nav__link"
                :to="link.to"
                :aria-current="isActive(link.name) ? 'page' : undefined"
              >
                {{ link.label }}
              </RouterLink>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </header>
</template>

<style scoped>
.ec-demo-header {
  flex-shrink: 0;
}

.ec-demo-header .fr-header__menu {
  box-shadow: inset 0 1px 0 0 var(--border-default-grey, #ddd);
}
</style>

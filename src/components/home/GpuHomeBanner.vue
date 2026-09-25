<script setup lang="ts">
import mapArtwork from '@gouvfr/dsfr/dist/artwork/pictograms/map/map.svg?url'
import cityHallArtwork from '@gouvfr/dsfr/dist/artwork/pictograms/buildings/city-hall.svg?url'
import documentDownloadArtwork from '@gouvfr/dsfr/dist/artwork/pictograms/document/document-download.svg?url'
import searchArtwork from '@gouvfr/dsfr/dist/artwork/pictograms/digital/search.svg?url'

withDefaults(
  defineProps<{
    title?: string
    searchLabel?: string
    showConsultBadge?: boolean
  }>(),
  {
    title: "Accédez aux documents d'urbanisme",
    searchLabel: 'Rechercher par lieu',
    showConsultBadge: true,
  },
)

const decorItems = [
  { class: 'gpu-banner-decor-item--top-left', href: mapArtwork },
  { class: 'gpu-banner-decor-item--top-right', href: cityHallArtwork },
  { class: 'gpu-banner-decor-item--bottom-left', href: documentDownloadArtwork },
  { class: 'gpu-banner-decor-item--bottom-right', href: searchArtwork },
] as const
</script>

<template>
  <div class="gpu-banner-container gpu-banner-container--dark">
    <div class="gpu-banner-decor" aria-hidden="true">
      <div
        v-for="item in decorItems"
        :key="item.class"
        class="gpu-banner-decor-item"
        :class="item.class"
      >
        <svg class="fr-artwork" aria-hidden="true" viewBox="0 0 80 80" width="75" height="75">
          <use class="fr-artwork-decorative" :href="`${item.href}#artwork-decorative`" />
          <use class="fr-artwork-minor" :href="`${item.href}#artwork-minor`" />
          <use class="fr-artwork-major" :href="`${item.href}#artwork-major`" />
        </svg>
      </div>
    </div>

    <div id="gpu_banner" class="fr-container fr-container--fluid gpu-banner-inner">
      <div class="fr-grid-row">
        <div class="fr-col-12">
          <h1 class="gpu-banner-title">{{ title }}</h1>
        </div>
      </div>
      <div class="gpu-banner-content fr-p-4w">
        <div>
          <p class="fr-label gpu-banner-search-label">
            {{ searchLabel }}
            <span v-if="showConsultBadge" class="fr-badge fr-badge--sm fr-badge--blue-cumulus">
              CONSULTER
            </span>
          </p>
          <div class="gpu-banner-search-engine">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Barre de recherche Géoplateforme (SearchEngineAdvanced) :
 * lieux, géoloc, recherche avancée (INSEE, toponymes, coords, parcelles).
 * Placement : haut-gauche (CSS), comme cartes.gouv.fr.
 */
import { useOlControl } from '@/composables/useOlControl'
import { createSearchEngineAdvanced } from '@/lib/search/createSearchEngineAdvanced'

const props = withDefaults(
  defineProps<{
    placeholder?: string
    collapsed?: boolean
    collapsible?: boolean
    /** Base URL des services Géoplateforme (géocodage, WFS…). */
    serviceBaseUrl?: string
  }>(),
  {
    placeholder: 'Rechercher un lieu...',
    collapsed: false,
    collapsible: false,
    serviceBaseUrl: 'https://data.geopf.fr',
  },
)

useOlControl(() =>
  createSearchEngineAdvanced({
    placeholder: props.placeholder,
    collapsed: props.collapsed,
    collapsible: props.collapsible,
    serviceBaseUrl: props.serviceBaseUrl,
  }),
)
</script>

<template>
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>

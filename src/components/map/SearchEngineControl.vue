<script setup lang="ts">
/**
 * Barre de recherche Géoplateforme (SearchEngineAdvanced) :
 * lieux, géoloc, recherche avancée (INSEE, toponymes, coords, parcelles).
 * Placement : haut-gauche (CSS), comme cartes.gouv.fr.
 */
import { useOlControl } from '@/composables/useOlControl'
import SearchEngineAdvanced from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/SearchEngineAdvanced.js'
import InseeAdvancedSearch from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/InseeAdvancedSearch.js'
import LocationAdvancedSearch from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/LocationAdvancedSearch.js'
import CoordinateAdvancedSearch from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/CoordinateAdvancedSearch.js'
import ParcelAdvancedSearch from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/ParcelAdvancedSearch.js'

const GEOPF_SERVICE_BASE = 'https://data.geopf.fr'

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
    serviceBaseUrl: GEOPF_SERVICE_BASE,
  },
)

useOlControl(() => {
  const base = props.serviceBaseUrl.replace(/\/$/, '')
  const searchOptions = {
    serverUrl: `${base}/geocodage/search`,
    wfsServerUrl: `${base}/wfs/ows?`,
    geocodeGetCapabilitiesUrl: `${base}/geocodage/getCapabilities`,
  }
  /** Options partagées des recherches avancées (cartes.gouv advancedSearchOptions). */
  const advancedSearchOptions = { searchOptions }

  return new SearchEngineAdvanced({
    collapsed: props.collapsed,
    collapsible: props.collapsible,
    returnTrueGeometry: true,
    placeholder: props.placeholder,
    autocompleteOptions: {
      serviceOptions: {
        maximumResponses: 10,
        serverUrl: `${base}/geocodage/completion?`,
      },
      prettifyResults: true,
      maximumEntries: 5,
    },
    searchOptions: {
      serviceOptions: {
        serverUrl: searchOptions.serverUrl,
      },
    },
    advancedSearch: [
      new InseeAdvancedSearch({ ...advancedSearchOptions, name: 'Code INSEE' }),
      new LocationAdvancedSearch({ ...advancedSearchOptions, name: 'Lieux et toponymes' }),
      new CoordinateAdvancedSearch({
        ...advancedSearchOptions,
        name: 'Coordonnées',
        coordinateSearch: {
          systems: [
            { label: 'Géographique', crs: 'EPSG:4326', type: 'Geographical' },
            { label: 'Web Mercator', crs: 'EPSG:3857', type: 'Metric' },
            { label: 'Lambert 93', crs: 'EPSG:2154', type: 'Metric' },
            { label: 'Lambert II étendu', crs: 'EPSG:27572', type: 'Metric' },
          ],
        },
      }),
      new ParcelAdvancedSearch({ ...advancedSearchOptions, name: 'Parcelles cadastrales' }),
    ],
  })
})
</script>

<template>
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>

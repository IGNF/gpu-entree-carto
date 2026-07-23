import SearchEngineAdvanced from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/SearchEngineAdvanced.js'
import InseeAdvancedSearch from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/InseeAdvancedSearch.js'
import LocationAdvancedSearch from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/LocationAdvancedSearch.js'
import CoordinateAdvancedSearch from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/CoordinateAdvancedSearch.js'
import ParcelAdvancedSearch from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/ParcelAdvancedSearch.js'

export const GEOPF_SERVICE_BASE = 'https://data.geopf.fr'

export interface CreateSearchEngineAdvancedOptions {
  placeholder?: string
  collapsed?: boolean
  collapsible?: boolean
  serviceBaseUrl?: string
  /** Cible DOM OpenLayers (hors viewport carte). */
  target?: HTMLElement | string
}

/**
 * Instancie le même SearchEngineAdvanced que sur la carte (barre + Avancée).
 */
export function createSearchEngineAdvanced(
  options: CreateSearchEngineAdvancedOptions = {},
): InstanceType<typeof SearchEngineAdvanced> {
  const base = (options.serviceBaseUrl ?? GEOPF_SERVICE_BASE).replace(/\/$/, '')
  const searchOptions = {
    serverUrl: `${base}/geocodage/search`,
    wfsServerUrl: `${base}/wfs/ows?`,
    geocodeGetCapabilitiesUrl: `${base}/geocodage/getCapabilities`,
  }
  const advancedSearchOptions = { searchOptions }

  return new SearchEngineAdvanced({
    collapsed: options.collapsed ?? false,
    collapsible: options.collapsible ?? false,
    returnTrueGeometry: true,
    placeholder: options.placeholder ?? 'Rechercher un lieu...',
    target: options.target,
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
}

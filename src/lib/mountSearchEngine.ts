import Map from 'ol/Map'
import View from 'ol/View'
import { defaults as defaultControls } from 'ol/control'
import { fromLonLat } from 'ol/proj'
import type Control from 'ol/control/Control'
import { createSearchEngineAdvanced } from '@/lib/search/createSearchEngineAdvanced'
import { attachStandalonePopoverSync } from '@/lib/search/attachStandalonePopoverSync'
import {
  locationFromGeolocation,
  locationFromGeopfFeature,
  locationFromGeopfSelect,
  redirectToMapWithLocation,
  type LocationPayload,
} from '@/lib/search/locationSearch'
import type { AutocompleteLocation } from '@/lib/types'
import 'ol/ol.css'
import 'geopf-extensions-openlayers/css/Dsfr.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@/styles/map-controls.css'
import '@/styles/search-engine-standalone.css'

export interface MountSearchEngineOptions {
  /** redirect (défaut) : POST/GET formulaire vers mapUrl ; emit : callback seul (SPA). */
  mode?: 'redirect' | 'emit'
  mapUrl?: string
  method?: 'GET' | 'POST'
  placeholder?: string
  serviceBaseUrl?: string
  onSelect?: (location: AutocompleteLocation) => void
}

export interface MountedSearchEngine {
  destroy: () => void
}

type SearchEngineLike = Control & {
  on: (type: string | string[], listener: (event: Record<string, unknown>) => void) => void
  un?: (type: string | string[], listener: (event: Record<string, unknown>) => void) => void
  _searchForms?: Array<{
    on: (type: string, listener: (event: Record<string, unknown>) => void) => void
    un?: (type: string, listener: (event: Record<string, unknown>) => void) => void
  }>
}

/**
 * Monte le même SearchEngineAdvanced que sur la carte, hors MapShell
 * (carte OL minimale invisible + redirection vers /map/).
 */
export function mountSearchEngine(
  container: HTMLElement,
  options: MountSearchEngineOptions = {},
): MountedSearchEngine {
  container.innerHTML = ''
  container.classList.add('ec-search-engine-standalone')

  const mapHost = document.createElement('div')
  mapHost.className = 'ec-search-engine-standalone__map-host'
  mapHost.setAttribute('aria-hidden', 'true')
  container.appendChild(mapHost)

  const widgetHost = document.createElement('div')
  widgetHost.className = 'ec-search-engine-standalone__widget'
  container.appendChild(widgetHost)

  const map = new Map({
    target: mapHost,
    controls: defaultControls({
      attribution: false,
      zoom: false,
      rotate: false,
    }),
    layers: [],
    view: new View({
      center: fromLonLat([2.424722, 46.763056]),
      zoom: 6,
      projection: 'EPSG:3857',
    }),
  })

  const control = createSearchEngineAdvanced({
    placeholder: options.placeholder ?? 'Rechercher une adresse, une ville, un lieu...',
    collapsed: false,
    collapsible: false,
    serviceBaseUrl: options.serviceBaseUrl,
    target: widgetHost,
  }) as SearchEngineLike

  map.addControl(control)

  const mode = options.mode ?? 'redirect'
  const mapUrl = options.mapUrl ?? '/map/'
  const method = options.method ?? 'POST'
  let redirected = false

  const finish = (location: LocationPayload | null) => {
    if (!location || redirected) return
    redirected = true
    options.onSelect?.(location as AutocompleteLocation)
    if (mode === 'redirect') {
      redirectToMapWithLocation(location, { mapUrl, method })
    }
  }

  const onSelect = (event: Record<string, unknown>) => {
    finish(locationFromGeopfSelect(event as Parameters<typeof locationFromGeopfSelect>[0]))
  }

  const onSearch = (event: Record<string, unknown>) => {
    const result = event.result
    if (result && typeof result === 'object' && 'getGeometry' in result) {
      finish(locationFromGeopfFeature(result as import('ol/Feature').default))
    }
  }

  const onGeolocate = (event: Record<string, unknown>) => {
    const coordinates = event.coordinates
    if (Array.isArray(coordinates)) {
      finish(locationFromGeolocation(coordinates as number[]))
    }
  }

  const onCombined = (event: Record<string, unknown>) => {
    if (event.type === 'select') onSelect(event)
    else if (event.type === 'search') onSearch(event)
  }

  control.on(['select', 'search'], onCombined)
  control.on('searchengineadvanced:geolocation:click', onGeolocate)

  const formListeners: Array<{
    form: NonNullable<SearchEngineLike['_searchForms']>[number]
    listener: (event: Record<string, unknown>) => void
  }> = []
  for (const form of control._searchForms ?? []) {
    const listener = (event: Record<string, unknown>) => onSearch(event)
    form.on('search', listener)
    formListeners.push({ form, listener })
  }

  const detachPopovers = attachStandalonePopoverSync(container)

  return {
    destroy() {
      redirected = true
      detachPopovers()
      control.un?.(['select', 'search'], onCombined)
      control.un?.('searchengineadvanced:geolocation:click', onGeolocate)
      for (const { form, listener } of formListeners) {
        form.un?.('search', listener)
      }
      map.removeControl(control)
      map.setTarget(undefined)
      container.innerHTML = ''
      container.classList.remove('ec-search-engine-standalone')
    },
  }
}

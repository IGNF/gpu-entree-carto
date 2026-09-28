<script setup lang="ts">
/**
 * Barre de recherche Géoplateforme (SearchEngineAdvanced) :
 * lieux, géoloc, recherche avancée (INSEE, toponymes, coords, parcelles).
 * Placement : haut-gauche (CSS), comme cartes.gouv.fr.
 *
 * `initialSearch` : rejoue la sélection comme un clic autocomplete
 * (cerise, emprise trueGeometry, popup) — parcours accueil → carte.
 */
import { watch } from 'vue'
import type Feature from 'ol/Feature'
import type Map from 'ol/Map'
import type Geometry from 'ol/geom/Geometry'
import Point from 'ol/geom/Point'
import { createEmpty, extend, getCenter, isEmpty } from 'ol/extent'
import type { Extent } from 'ol/extent'
import { toLonLat } from 'ol/proj'
import type Control from 'ol/control/Control'
import { Style, Icon, Stroke, Fill } from 'ol/style'
import mapPinIcon from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/map-pin-2-fill.svg'
import { useOlControl } from '@/composables/useOlControl'
import { createSearchEngineAdvanced } from '@/lib/search/createSearchEngineAdvanced'
import { tabPanelsApiRef } from '@/composables/tabPanels'
import { tryUseMapMode } from '@/composables/mapMode'
import type { StandardViewerSearch } from '@/lib/types'
import { loadFicheForSearch } from '@/lib/fiche/ficheInfoService'
import { animateViewFit } from '@/lib/map/animateViewFit'
import { setMapLocationMarker, type MapLocationMarkerFn } from '@/composables/mapLocationMarker'
import {
  dismissSearchEnginePopup,
  empriseTargetKeyForPoint,
  ensureCommuneEmpriseOnSearchLayer,
  searchEngineLayerHostRef,
  shouldDrawCommuneEmpriseFallback,
} from '@/lib/map/searchResultGraphics'

const props = withDefaults(
  defineProps<{
    placeholder?: string
    collapsed?: boolean
    collapsible?: boolean
    /** Base URL des services Géoplateforme (géocodage, WFS…). */
    serviceBaseUrl?: string
    /** Recherche initiale (accueil / createStandardViewer params.search). */
    initialSearch?: StandardViewerSearch | null
  }>(),
  {
    placeholder: 'Rechercher un lieu...',
    collapsed: false,
    collapsible: false,
    serviceBaseUrl: 'https://data.geopf.fr',
    initialSearch: null,
  },
)

type SearchEngineAdvancedLike = Control & {
  createMarker: (coords: number[], content: string, origin?: string, center?: boolean) => void
  getMap: () => Map | null
  on: (
    type: string,
    listener: (evt?: { result?: Feature; extent?: Feature; center?: boolean }) => void,
  ) => void
  un?: (
    type: string,
    listener: (evt?: { result?: Feature; extent?: Feature; center?: boolean }) => void,
  ) => void
  popup?: {
    get: (key: string) => unknown
    setPosition: (coordinate: number[] | undefined) => void
  }
  layer?: {
    getSource: () => {
      getFeatures: () => Feature[]
      clear: () => void
      addFeature: (feature: Feature) => void
    } | null
  }
  selectInteraction?: {
    getFeatures: () => {
      getArray: () => Feature[]
      clear: () => void
      push: (feature: Feature) => void
    }
  }
  _setPopupInfo?: (feature: Feature) => void
  baseSearchEngine: {
    input: HTMLInputElement
    search: (item: { location?: unknown; text?: string }) => void
  }
}

let appliedKey: string | null = null

function searchKey(search: StandardViewerSearch | null | undefined): string | null {
  if (!search?.fullText) return null
  const x = search.position?.x
  const y = search.position?.y
  return `${search.fullText}|${x ?? ''}|${y ?? ''}|${search.type ?? ''}`
}

function openFicheFromSearch(search: StandardViewerSearch): void {
  const map = controlRef.value?.getMap?.() ?? null
  const zoom = map?.getView().getZoom() ?? 6
  const mode = tryUseMapMode()?.mode.value ?? 2
  void loadFicheForSearch(search, mode, zoom)
}

function searchFromGeopfResult(control: SearchEngineAdvancedLike): StandardViewerSearch | null {
  const label = control.baseSearchEngine.input.value.trim()
  const feature = control.popup?.get('feature') as Feature | undefined
  if (!label && !feature) return null

  let x: number | undefined
  let y: number | undefined
  const geometry = feature?.getGeometry()
  if (geometry) {
    let coord: number[] | undefined
    if (geometry.getType() === 'Point') {
      coord = (geometry as Point).getCoordinates()
    } else {
      const interior = (
        geometry as Geometry & { getInteriorPoint?: () => Point }
      ).getInteriorPoint?.()
      coord = interior?.getCoordinates() ?? getCenter(geometry.getExtent())
    }
    if (coord) {
      ;[x, y] = toLonLat(coord)
    }
  }

  const origin = feature?.get('origin')
  const featureType = feature?.get('type')
  return {
    fullText: label || String(feature?.get('infoPopup') ?? 'Résultat'),
    type:
      (typeof featureType === 'string' && featureType) ||
      (typeof origin === 'string' ? origin : undefined),
    kind: typeof feature?.get('kind') === 'string' ? (feature.get('kind') as string) : undefined,
    ...(Number.isFinite(x) && Number.isFinite(y) ? { position: { x: x!, y: y! } } : {}),
  }
}

/** Largeur du bandeau TabPanels ouvert (onglets + panneau). */
function tabPanelsRightInset(): number {
  const el = document.querySelector('.ec-tab-panels.is-open')
  if (!(el instanceof HTMLElement)) return 40
  return Math.ceil(el.getBoundingClientRect().width) + 24
}

/** Pin geopf (bleu + halo blanc) — visible même si Select a désélectionné la feature. */
function pinMarkerStyle(): Style[] {
  const make = (color: string | number[]) =>
    new Style({
      image: new Icon({
        src: mapPinIcon,
        color,
        anchor: [0.5, 1],
      }),
      stroke: new Stroke({ color, width: 2 }),
      fill: new Fill({ color: 'rgba(0, 0, 0, 0.1)' }),
    })
  return [make([255, 255, 255, 1]), make([0, 0, 145, 1])]
}

function searchResultFeature(control: SearchEngineAdvancedLike): Feature | null {
  const source = control.layer?.getSource() ?? null
  let feature = control.popup?.get('feature') as Feature | undefined
  if (!feature) {
    feature = source?.getFeatures()[0]
  }
  return feature ?? null
}

/** Emprise de vol : polygone trueGeometry si présent, sinon cerise (comportement geopf). */
function searchResultViewExtent(control: SearchEngineAdvancedLike): Extent | null {
  const source = control.layer?.getSource() ?? null
  if (!source) return null
  const features = source.getFeatures()
  if (!features.length) return null

  const emprise = createEmpty()
  let hasEmprise = false
  for (const f of features) {
    const geometry = f.getGeometry()
    if (!geometry || geometry.getType() === 'Point') continue
    extend(emprise, geometry.getExtent())
    hasEmprise = true
  }
  if (hasEmprise && !isEmpty(emprise)) return emprise

  const combined = createEmpty()
  for (const f of features) {
    const geometry = f.getGeometry()
    if (geometry) extend(combined, geometry.getExtent())
  }
  return isEmpty(combined) ? null : combined
}

/** Cerise visible, sans popup ; conserve l’emprise (ne pas vider la couche). */
function prepareSearchResultOnMap(control: SearchEngineAdvancedLike): Feature | null {
  const map = control.getMap()
  if (!map) return null

  const source = control.layer?.getSource() ?? null
  const feature = searchResultFeature(control)
  const geometry = feature?.getGeometry()
  if (!feature || !geometry) return null

  if (source && !source.getFeatures().includes(feature)) {
    source.addFeature(feature)
  }

  if (geometry.getType() === 'Point') {
    feature.setStyle(pinMarkerStyle())
  }

  const selected = control.selectInteraction?.getFeatures()
  if (selected && !selected.getArray().includes(feature)) {
    selected.push(feature)
  }

  dismissSearchEnginePopup(control)
  return feature
}

/** Vol animé vers l’emprise du résultat (padding si panneau fiche ouvert). */
function animateViewToSearchResult(control: SearchEngineAdvancedLike): void {
  const map = control.getMap()
  if (!map) return
  const extent = searchResultViewExtent(control)
  if (!extent) return

  const rightPad = tabPanelsApiRef.value?.isOpen.value ? tabPanelsRightInset() : 72
  animateViewFit(map, extent, {
    padding: [72, rightPad, 72, 72],
    maxZoom: 15,
  })
}

function onLocationSearchResult(
  control: SearchEngineAdvancedLike,
  empriseKey: string,
  lon: number,
  lat: number,
  search: StandardViewerSearch | null,
  searchEvent?: { extent?: Feature },
): void {
  prepareSearchResultOnMap(control)
  animateViewToSearchResult(control)
  if (shouldDrawCommuneEmpriseFallback(search, control, searchEvent)) {
    void ensureCommuneEmpriseOnSearchLayer(control, lon, lat, empriseKey)
  }
}

/**
 * Rejoue une recherche sans planter IGNSearchService (poiType optionnel).
 * - Avec coords : createMarker (cerise + popup) puis géocode texte pour l’emprise.
 * - Géoloc (`type: geolocate`) : marker + fiche uniquement — pas de géocode texte
 *   (« Ma localisation » échoue et `addResultToMap` vide la couche → marker perdu).
 * - Fiche TabPanels ouverte **avant** le marker, puis recentrage avec padding panneau.
 * - Objet location toujours avec poiType: [] si absent.
 */
function applyInitialSearch(control: SearchEngineAdvancedLike, search: StandardViewerSearch): void {
  const key = searchKey(search)
  if (!key || key === appliedKey) return
  appliedKey = key

  const label = search.fullText ?? ''
  control.baseSearchEngine.input.value = label

  const x = Number(search.position?.x)
  const y = Number(search.position?.y)
  const hasCoords = Number.isFinite(x) && Number.isFinite(y)
  const isGeolocate = search.type === 'geolocate'
  const willGeocode = Boolean(label && !isGeolocate)

  // Fiche immédiate sauf si un géocode va déplacer le résultat (fiche + cerise via onSearch).
  if (!willGeocode) {
    openFicheFromSearch(search)
  }

  if (hasCoords) {
    // Même format que geopf (géoloc native / lieux) : pas de <p> (marges DSFR
    // → trait parasite entre bulle et appendice).
    control.createMarker([x, y], '', isGeolocate ? 'geolocate' : 'searchAtInit', true)
    dismissSearchEnginePopup(control)
  }

  // Géoloc : coords déjà connues ; un géocode du libellé effacerait le marker.
  if (!label || isGeolocate) return

  const poiType = Array.isArray(search.poiType) ? search.poiType : []
  // Géocode pour emprise / popup enrichie (évite location.poiType undefined)
  control.baseSearchEngine.search({
    location: {
      fullText: label,
      type: search.type,
      kind: search.kind,
      poiType,
      ...(hasCoords ? { position: { x, y } } : {}),
    },
  })
}

const controlRef = useOlControl(() =>
  createSearchEngineAdvanced({
    placeholder: props.placeholder,
    collapsed: props.collapsed,
    collapsible: props.collapsible,
    serviceBaseUrl: props.serviceBaseUrl,
  }),
)

function bindMapLocationMarker(control: SearchEngineAdvancedLike): MapLocationMarkerFn {
  return (lon, lat, options) => {
    if (!control.getMap()) return
    const origin = options?.origin ?? 'ficheInfo'
    control.createMarker([lon, lat], '', origin, options?.center ?? false)
    dismissSearchEnginePopup(control)
  }
}

watch(
  controlRef,
  (control, _prev, onCleanup) => {
    if (!control) {
      setMapLocationMarker(null)
      searchEngineLayerHostRef.value = null
      return
    }
    const advanced = control as SearchEngineAdvancedLike
    searchEngineLayerHostRef.value = advanced
    setMapLocationMarker(bindMapLocationMarker(advanced))
    onCleanup(() => {
      setMapLocationMarker(null)
      searchEngineLayerHostRef.value = null
    })
    const onSearch = (e?: { result?: Feature; extent?: Feature; center?: boolean }) => {
      const fromFicheInfo = e?.result?.get?.('origin') === 'ficheInfo'
      requestAnimationFrame(() => {
        // Cerise clic info / GetFeatureInfo : pas de recentrage ni rechargement fiche.
        if (fromFicheInfo) return
        const search = searchFromGeopfResult(advanced)
        const lon = Number(search?.position?.x)
        const lat = Number(search?.position?.y)
        if (Number.isFinite(lon) && Number.isFinite(lat)) {
          const empriseKey = empriseTargetKeyForPoint(lon, lat)
          onLocationSearchResult(advanced, empriseKey, lon, lat, search, e)
        } else {
          prepareSearchResultOnMap(advanced)
          animateViewToSearchResult(advanced)
        }
        if (search?.fullText) openFicheFromSearch(search)
      })
    }
    advanced.on('search', onSearch)
    onCleanup(() => advanced.un?.('search', onSearch))
  },
  { immediate: true },
)

watch(
  [controlRef, () => props.initialSearch],
  ([control, search]) => {
    if (!control || !search?.fullText) return
    requestAnimationFrame(() => {
      applyInitialSearch(control as SearchEngineAdvancedLike, search)
    })
  },
  { immediate: true },
)
</script>

<template>
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>

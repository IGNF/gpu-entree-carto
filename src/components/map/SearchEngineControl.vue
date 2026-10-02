<script setup lang="ts">
/**
 * Barre de recherche Géoplateforme (SearchEngineAdvanced) :
 * lieux, géoloc, recherche avancée (INSEE, toponymes, coords, parcelles).
 * Placement : haut-gauche (CSS), comme cartes.gouv.fr.
 *
 * `initialSearch` : rejoue la sélection comme un clic autocomplete
 * (cerise, emprise trueGeometry, popup) — parcours accueil → carte.
 */
import { inject, onMounted, shallowRef, watch } from 'vue'
import type { ShallowRef } from 'vue'
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
import { useMobileSearchPopoverSync } from '@/composables/useMobileSearchPopoverSync'
import { createSearchEngineAdvanced } from '@/lib/search/createSearchEngineAdvanced'
import { useMapMode } from '@/composables/mapMode'
import type { StandardViewerSearch } from '@/lib/types'
import { loadFicheForSearch } from '@/lib/fiche/ficheInfoService'
import { animateViewFit } from '@/lib/map/animateViewFit'
import { defaultMapViewFitPadding } from '@/lib/map/mapViewFitPadding'
import { setMapLocationMarker, type MapLocationMarkerFn } from '@/composables/mapLocationMarker'
import {
  dismissSearchEnginePopup,
  empriseTargetKeyForModeFocus,
  ensureModeEmpriseOnSearchLayer,
  MODE_EMPRISE_PROP,
  searchEngineLayerHostRef,
} from '@/lib/map/searchResultGraphics'
import { DEFAULT_MAP_MODE, normalizeMapMode, type MapModeId } from '@/lib/map/mapMode'
import { setMapPermalinkMarker } from '@/lib/map/mapPermalink'
import {
  bindPlaceSearchSubmitReplay,
  extentFromStored,
  rememberLastPlaceSearch,
  scheduleCaptureSearchViewSnapshot,
  storedPlaceViewExtent,
  type LastPlaceSearch,
} from '@/lib/search/placeSearchSubmitReplay'

/** Bleu France — cerise localisation (gpu-client / cartes.gouv.fr). */
const GPU_PIN_BLUE = '#000091'

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
    setStyle?: (style: Style | Style[]) => void
    setActive?: (active: boolean) => void
    on?: (type: string, listener: () => void) => void
    un?: (type: string, listener: () => void) => void
  }
  _setPopupInfo?: (feature: Feature) => void
  baseSearchEngine: {
    input: HTMLInputElement
    search: (item: { location?: unknown; text?: string }) => void
    container: HTMLFormElement
    autocompleteList: HTMLUListElement
    acContainer: HTMLElement
  }
}

let appliedKey: string | null = null

/** inject() ne fonctionne pas dans les callbacks rAF / geopf — capturer le contexte au setup. */
const mapMode = useMapMode()

function searchKey(search: StandardViewerSearch | null | undefined): string | null {
  if (!search?.fullText) return null
  const x = search.position?.x
  const y = search.position?.y
  return `${search.fullText}|${x ?? ''}|${y ?? ''}|${search.type ?? ''}`
}

function openFicheFromSearch(search: StandardViewerSearch): void {
  const map = controlRef.value?.getMap?.() ?? null
  const zoom = map?.getView().getZoom() ?? 6
  const mode = normalizeMapMode(mapMode.mode.value) ?? DEFAULT_MAP_MODE
  void loadFicheForSearch(search, mode, zoom)
}

function searchLabelFromFeature(feature: Feature | undefined): string {
  if (!feature) return ''
  const toponyme = feature.get('toponyme')
  if (typeof toponyme === 'string' && toponyme.trim()) return toponyme.trim()
  const infoPopup = feature.get('infoPopup')
  if (typeof infoPopup === 'string' && infoPopup.trim()) {
    const plain = infoPopup
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (plain) return plain
  }
  return ''
}

function searchFromGeopfResult(
  control: SearchEngineAdvancedLike,
  searchEvent?: { result?: Feature; extent?: Feature },
): StandardViewerSearch | null {
  const label = control.baseSearchEngine.input.value.trim()
  let feature = control.popup?.get('feature') as Feature | undefined
  if (!feature && searchEvent?.result) {
    feature = searchEvent.result
  }
  const resolvedLabel = label || searchLabelFromFeature(feature)
  if (!resolvedLabel && !feature) return null

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
    fullText: resolvedLabel || 'Résultat',
    type:
      (typeof featureType === 'string' && featureType) ||
      (typeof origin === 'string' ? origin : undefined),
    kind: typeof feature?.get('kind') === 'string' ? (feature.get('kind') as string) : undefined,
    ...(Number.isFinite(x) && Number.isFinite(y) ? { position: { x: x!, y: y! } } : {}),
  }
}

/** Pin geopf (bleu #000091 + halo blanc). */
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
  return [make('#ffffff'), make(GPU_PIN_BLUE)]
}

/**
 * geopf Select applique du rouge ([145,0,0]) au clic sur la cerise — style bleu,
 * pas de sélection au clic (fiche via ClickInfoControl / recherche).
 */
function configureSearchPinInteraction(control: SearchEngineAdvancedLike): void {
  const select = control.selectInteraction
  if (!select) return
  select.setStyle?.(pinMarkerStyle())
  select.setActive?.(false)
}

function bindSearchPinSelectGuard(control: SearchEngineAdvancedLike): () => void {
  const select = control.selectInteraction
  if (!select?.on) return () => {}
  const onSelect = () => {
    requestAnimationFrame(() => enforceSearchLayerPinStyles(control))
  }
  select.on('select', onSelect)
  return () => select.un?.('select', onSelect)
}

function enforceSearchLayerPinStyles(control: SearchEngineAdvancedLike): void {
  const source = control.layer?.getSource()
  if (source) {
    for (const feature of source.getFeatures()) {
      if (feature.getGeometry()?.getType() === 'Point') {
        feature.setStyle(pinMarkerStyle())
      }
    }
  }
  control.selectInteraction?.getFeatures()?.clear()
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
    if (f.get(MODE_EMPRISE_PROP)) continue
    const geometry = f.getGeometry()
    if (!geometry || geometry.getType() === 'Point') continue
    extend(emprise, geometry.getExtent())
    hasEmprise = true
  }
  if (hasEmprise && !isEmpty(emprise)) return emprise

  const combined = createEmpty()
  for (const f of features) {
    if (f.get(MODE_EMPRISE_PROP)) continue
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

  enforceSearchLayerPinStyles(control)

  dismissSearchEnginePopup(control)
  return feature
}

/** Vol animé vers l’emprise lieu (geopf / cerise), jamais l’emprise mode rouge. */
function animateViewToPlaceExtent(control: SearchEngineAdvancedLike, extent: Extent | null): void {
  const map = control.getMap()
  if (!map || !extent || isEmpty(extent)) return
  animateViewFit(map, extent, {
    padding: defaultMapViewFitPadding(),
    maxZoom: 15,
  })
}

function resolveMapModeForEmprise(): MapModeId {
  return normalizeMapMode(mapMode.mode.value) ?? DEFAULT_MAP_MODE
}

function syncModeEmpriseAfterSearch(
  control: SearchEngineAdvancedLike,
  lon: number,
  lat: number,
): void {
  const empriseKey = empriseTargetKeyForModeFocus(lon, lat)
  void ensureModeEmpriseOnSearchLayer(control, lon, lat, resolveMapModeForEmprise(), empriseKey)
}

function onLocationSearchResult(
  control: SearchEngineAdvancedLike,
  lon: number,
  lat: number,
  options?: { placeViewExtent?: Extent | null },
): Extent | null {
  setMapPermalinkMarker(lon, lat)
  prepareSearchResultOnMap(control)
  const placeExtent = options?.placeViewExtent ?? searchResultViewExtent(control)
  animateViewToPlaceExtent(control, placeExtent)
  requestAnimationFrame(() => {
    syncModeEmpriseAfterSearch(control, lon, lat)
  })
  scheduleCaptureSearchViewSnapshot(control.getMap())
  return placeExtent
}

function commitLastPlaceSearch(
  control: SearchEngineAdvancedLike,
  search: StandardViewerSearch,
  lon: number,
  lat: number,
  placeViewExtent: Extent | null,
): void {
  const label = control.baseSearchEngine.input.value.trim()
  if (!label) return
  rememberLastPlaceSearch({
    label,
    lon,
    lat,
    search,
    placeViewExtent: storedPlaceViewExtent(placeViewExtent),
  })
}

function replayLastPlaceSearch(control: SearchEngineAdvancedLike, last: LastPlaceSearch): void {
  const storedExtent = last.placeViewExtent ? extentFromStored(last.placeViewExtent) : null
  onLocationSearchResult(control, last.lon, last.lat, {
    placeViewExtent: storedExtent,
  })
  openFicheFromSearch(last.search)
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
    enforceSearchLayerPinStyles(control)
    setMapPermalinkMarker(x, y)
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

const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
const { startMobileSearchPopoverSync } = useMobileSearchPopoverSync(mapRef)

onMounted(() => {
  startMobileSearchPopoverSync()
})

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
    enforceSearchLayerPinStyles(control)
    setMapPermalinkMarker(lon, lat)
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
    configureSearchPinInteraction(advanced)
    const unbindPinSelectGuard = bindSearchPinSelectGuard(advanced)
    const unbindSubmitReplay = bindPlaceSearchSubmitReplay(
      advanced,
      (last) => replayLastPlaceSearch(advanced, last),
      () => advanced.getMap(),
    )
    searchEngineLayerHostRef.value = advanced
    setMapLocationMarker(bindMapLocationMarker(advanced))
    onCleanup(() => {
      unbindPinSelectGuard()
      unbindSubmitReplay()
      setMapLocationMarker(null)
      searchEngineLayerHostRef.value = null
    })
    const onSearch = (e?: { result?: Feature; extent?: Feature; center?: boolean }) => {
      const origin = e?.result?.get?.('origin')
      const fromFicheInfo = origin === 'ficheInfo'
      const fromPermalinkRestore = origin === 'permalink'
      requestAnimationFrame(() => {
        if (fromFicheInfo || fromPermalinkRestore) {
          enforceSearchLayerPinStyles(advanced)
          return
        }
        const search = searchFromGeopfResult(advanced, e)
        const lon = Number(search?.position?.x)
        const lat = Number(search?.position?.y)
        if (Number.isFinite(lon) && Number.isFinite(lat)) {
          const placeExtent = onLocationSearchResult(advanced, lon, lat)
          if (search) commitLastPlaceSearch(advanced, search, lon, lat, placeExtent)
        } else {
          prepareSearchResultOnMap(advanced)
          const placeExtent = searchResultViewExtent(advanced)
          animateViewToPlaceExtent(advanced, placeExtent)
          const feature = searchResultFeature(advanced)
          const geometry = feature?.getGeometry()
          if (geometry) {
            let coord: number[] | undefined
            if (geometry.getType() === 'Point') {
              coord = (geometry as Point).getCoordinates()
            } else {
              coord = getCenter(geometry.getExtent())
            }
            if (coord) {
              const [fallbackLon, fallbackLat] = toLonLat(coord)
              syncModeEmpriseAfterSearch(advanced, fallbackLon, fallbackLat)
              scheduleCaptureSearchViewSnapshot(advanced.getMap())
              if (search)
                commitLastPlaceSearch(advanced, search, fallbackLon, fallbackLat, placeExtent)
            }
          }
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

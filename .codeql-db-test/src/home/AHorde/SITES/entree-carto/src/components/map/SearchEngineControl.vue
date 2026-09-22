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
import type Control from 'ol/control/Control'
import { Style, Icon, Stroke, Fill } from 'ol/style'
import mapPinIcon from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/map-pin-2-fill.svg'
import { useOlControl } from '@/composables/useOlControl'
import { createSearchEngineAdvanced } from '@/lib/search/createSearchEngineAdvanced'
import { tabPanelsApiRef } from '@/composables/tabPanels'
import type { StandardViewerSearch } from '@/lib/types'

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
  on: (type: string, listener: () => void) => void
  un?: (type: string, listener: () => void) => void
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
  const label = search.fullText?.trim()
  const tabPanels = tabPanelsApiRef.value
  if (!label || !tabPanels) return
  const parts: string[] = [`<p><strong>${escapeHtml(label)}</strong></p>`]
  if (search.type) {
    parts.push(`<p>Type : ${escapeHtml(String(search.type))}</p>`)
  }
  if (search.position) {
    parts.push(`<p>Coordonnées : ${search.position.x}, ${search.position.y}</p>`)
  }
  tabPanels.showSelection({
    title: label,
    bodyHtml: parts.join(''),
    raw: {
      fullText: label,
      type: search.type ?? null,
      kind: search.kind ?? null,
      position_x: search.position?.x ?? null,
      position_y: search.position?.y ?? null,
      poiType: search.poiType ?? [],
    },
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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

/**
 * Recentage dans la zone carte encore visible + réaffiche marker / popup geopf.
 * Sans ça, `view.fit` centre sous le panneau opaque → marker/popup « disparaissent ».
 * Réattache aussi la feature si la couche a été vidée (popup orpheline).
 */
function refitPopupForOpenPanels(control: SearchEngineAdvancedLike): void {
  if (!tabPanelsApiRef.value?.isOpen.value) return
  const map = control.getMap()
  if (!map) return

  const source = control.layer?.getSource() ?? null
  let feature = control.popup?.get('feature') as Feature | undefined
  if (!feature) {
    feature = source?.getFeatures()[0]
  }
  const geometry = feature?.getGeometry()
  if (!feature || !geometry) return

  // Couche vide après un search geopf sans résultat → remettre le pin.
  if (source && !source.getFeatures().includes(feature)) {
    source.clear()
    source.addFeature(feature)
  }

  // Style propre : le pin reste visible si Select ne le redessine plus
  // (désélection / clear couche) — le pin bleu couche est peu visible sur fond plan.
  feature.setStyle(pinMarkerStyle())

  const selected = control.selectInteraction?.getFeatures()
  if (selected && !selected.getArray().includes(feature)) {
    selected.push(feature)
  }

  map.getView().fit(geometry.getExtent(), {
    padding: [72, tabPanelsRightInset(), 72, 72],
    maxZoom: 15,
  })

  control._setPopupInfo?.(feature)
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

  // Panneau d’abord : le fit geopf doit tenir compte de la zone masquée.
  openFicheFromSearch(search)

  if (hasCoords) {
    // Même format que geopf (géoloc native / lieux) : pas de <p> (marges DSFR
    // → trait parasite entre bulle et appendice).
    const popupHtml = isGeolocate ? `<strong>${escapeHtml(label)}</strong><br/>${x}, ${y}` : label
    control.createMarker([x, y], popupHtml, isGeolocate ? 'geolocate' : 'searchAtInit', true)
    requestAnimationFrame(() => refitPopupForOpenPanels(control))
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

/** Après chaque résultat geopf, recentrer hors du panneau si la fiche est ouverte. */
watch(
  controlRef,
  (control, _prev, onCleanup) => {
    if (!control) return
    const advanced = control as SearchEngineAdvancedLike
    const onSearch = () => {
      requestAnimationFrame(() => refitPopupForOpenPanels(advanced))
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

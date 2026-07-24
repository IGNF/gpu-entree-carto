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
import { useOlControl } from '@/composables/useOlControl'
import { createSearchEngineAdvanced } from '@/lib/search/createSearchEngineAdvanced'
import { tabPanelsApiRef } from '@/composables/tabPanels'
import type { StandardViewerSearch } from '@/lib/types'
import type Control from 'ol/control/Control'

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
  createMarker: (
    coords: number[],
    content: string,
    origin?: string,
    center?: boolean,
  ) => void
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
    parts.push(
      `<p>Coordonnées : ${search.position.x}, ${search.position.y}</p>`,
    )
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

/**
 * Rejoue une recherche sans planter IGNSearchService (poiType optionnel).
 * - Avec coords : createMarker (cerise + popup) puis géocode texte pour l’emprise.
 * - Objet location toujours avec poiType: [] si absent.
 * - Ouvre l’onglet fiche info du TabPanels si présent.
 */
function applyInitialSearch(
  control: SearchEngineAdvancedLike,
  search: StandardViewerSearch,
): void {
  const key = searchKey(search)
  if (!key || key === appliedKey) return
  appliedKey = key

  const label = search.fullText ?? ''
  control.baseSearchEngine.input.value = label

  const x = Number(search.position?.x)
  const y = Number(search.position?.y)
  const hasCoords = Number.isFinite(x) && Number.isFinite(y)

  if (hasCoords) {
    // Affichage immédiat (cerise + popup), indépendant du géocode
    control.createMarker([x, y], label, 'searchAtInit', true)
  }

  openFicheFromSearch(search)

  if (!label) return

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

import type { Extent } from 'ol/extent'
import type Map from 'ol/Map'
import type { StandardViewerSearch } from '@/lib/types'

/** Emprise de vol « lieu » (geopf), en projection carte — hors emprise mode rouge. */
export type StoredPlaceViewExtent = [number, number, number, number]

export type LastPlaceSearch = {
  /** Libellé affiché dans le champ (après sélection geopf). */
  label: string
  lon: number
  lat: number
  search: StandardViewerSearch
  /** Capturée avant retrait de l’emprise geopf par l’emprise mode. */
  placeViewExtent: StoredPlaceViewExtent | null
}

export function storedPlaceViewExtent(extent: Extent | null): StoredPlaceViewExtent | null {
  if (!extent) return null
  return [extent[0], extent[1], extent[2], extent[3]]
}

export function extentFromStored(stored: StoredPlaceViewExtent): Extent {
  return stored
}

export type SearchEngineFormHost = {
  baseSearchEngine: {
    input: HTMLInputElement
    container: HTMLFormElement
    autocompleteList: HTMLUListElement
    acContainer: HTMLElement
  }
}

type ViewSnapshot = {
  center: [number, number]
  zoom: number
}

let lastPlaceSearch: LastPlaceSearch | null = null
let lastSearchView: ViewSnapshot | null = null

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr')
}

function autocompleteSuggestionsVisible(host: SearchEngineFormHost): boolean {
  const { acContainer, autocompleteList } = host.baseSearchEngine
  if (acContainer.classList.contains('gpf-hidden')) return false
  if (acContainer.classList.contains('GPelementHidden')) return false
  return autocompleteList.querySelectorAll('li').length > 0
}

export function rememberLastPlaceSearch(entry: LastPlaceSearch): void {
  lastPlaceSearch = entry
  lastSearchView = null
}

/** Enregistre centre / zoom une fois l’animation post-recherche terminée. */
export function scheduleCaptureSearchViewSnapshot(map: Map | null): void {
  if (!map) return
  map.once('moveend', () => {
    const view = map.getView()
    const center = view.getCenter()
    const zoom = view.getZoom()
    if (!center || zoom == null) return
    lastSearchView = { center: [center[0], center[1]], zoom }
  })
}

export function mapViewChangedSinceLastPlaceSearch(map: Map): boolean {
  if (!lastSearchView) return true
  const view = map.getView()
  const center = view.getCenter()
  const zoom = view.getZoom()
  if (!center || zoom == null) return true
  const dx = Math.abs(center[0] - lastSearchView.center[0])
  const dy = Math.abs(center[1] - lastSearchView.center[1])
  const dz = Math.abs(zoom - lastSearchView.zoom)
  return dx > 2 || dy > 2 || dz > 0.01
}

export function getLastPlaceSearch(): LastPlaceSearch | null {
  return lastPlaceSearch
}

/**
 * Bouton loupe : geopf ne clique une suggestion que si la liste est peuplée.
 * Rejoue le dernier lieu si le libellé est inchangé et que la vue a bougé.
 */
export function tryReplayPlaceSearchOnSubmit(
  host: SearchEngineFormHost,
  e: Event,
  replay: (last: LastPlaceSearch) => void,
  getMap: () => Map | null,
): void {
  if (!(e instanceof SubmitEvent)) return
  const submitter = e.submitter
  if (!(submitter instanceof HTMLButtonElement) || submitter.type !== 'submit') return

  const last = lastPlaceSearch
  if (!last) return

  const inputValue = host.baseSearchEngine.input.value
  if (normalizeLabel(inputValue) !== normalizeLabel(last.label)) return

  if (autocompleteSuggestionsVisible(host)) return

  const map = getMap()
  if (!map || !mapViewChangedSinceLastPlaceSearch(map)) return

  e.preventDefault()
  e.stopImmediatePropagation()
  replay(last)
}

export function bindPlaceSearchSubmitReplay(
  host: SearchEngineFormHost,
  replay: (last: LastPlaceSearch) => void,
  getMap: () => Map | null,
): () => void {
  const onSubmit = (e: Event) => tryReplayPlaceSearchOnSubmit(host, e, replay, getMap)
  host.baseSearchEngine.container.addEventListener('submit', onSubmit, true)
  return () => host.baseSearchEngine.container.removeEventListener('submit', onSubmit, true)
}

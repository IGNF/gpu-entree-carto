import SearchEngineAdvanced from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/SearchEngineAdvanced.js'
import Feature from 'ol/Feature'

type SearchResultEvent = {
  center?: boolean
  result?: unknown
  extent?: unknown
  /** Carte déjà mise à jour (recherche avancée) — évite un second `addResultToMap`. */
  entreeMapAlreadyUpdated?: boolean
}

type SearchEngineAdvancedProto = SearchEngineAdvanced & {
  addResultToMap: (evt: SearchResultEvent) => void
  _setPopupInfo: (feature?: Feature, position?: number[]) => void
  popup: {
    setPosition: (coordinate: number[] | undefined) => void
    set: (key: string, value: unknown) => void
    unset: (key: string) => void
  }
  layer: { set: (key: string, value: unknown) => void }
  setPopupContent: (content: string) => void
}

/**
 * Désactive le `view.fit` instantané de geopf — le recentrage animé est géré
 * dans `SearchEngineControl` (padding panneau latéral).
 * Pas de popup HTML sur la carte (fiche dans le panneau latéral).
 */
export default class SearchEngineAdvancedAnimated extends SearchEngineAdvanced {
  addResultToMap(e: SearchResultEvent) {
    if (e.entreeMapAlreadyUpdated) {
      return
    }
    const proto = SearchEngineAdvanced.prototype as SearchEngineAdvancedProto
    if (e.center !== false) {
      proto.addResultToMap.call(this, { ...e, center: false })
      return
    }
    proto.addResultToMap.call(this, e)
  }

  /**
   * geopf n’émet pas `search` pour les formulaires avancés — aligner sur `createMarker`
   * (addResultToMap puis dispatch) pour cerise bleue + vol animé côté SearchEngineControl.
   */
  onAdvancedSearchResult(e: SearchResultEvent) {
    const parent = SearchEngineAdvanced.prototype as SearchEngineAdvanced & {
      onAdvancedSearchResult: (evt: SearchResultEvent) => void
    }
    parent.onAdvancedSearchResult.call(this, e)
    const result = e.result
    if (result instanceof Feature) {
      this.dispatchEvent({
        ...e,
        type: 'search',
        center: false,
        entreeMapAlreadyUpdated: true,
      } as unknown as Parameters<SearchEngineAdvanced['dispatchEvent']>[0])
    }
  }

  _setPopupInfo(feature?: Feature) {
    const self = this as unknown as SearchEngineAdvancedProto
    const layer = (this as unknown as { getLayer: () => unknown }).getLayer()
    if (feature) {
      self.popup.set('feature', feature)
      self.popup.set('layer', layer)
    } else {
      self.popup.unset('feature')
      self.popup.unset('layer')
    }
    self.setPopupContent('')
    self.popup.setPosition(undefined)
  }
}

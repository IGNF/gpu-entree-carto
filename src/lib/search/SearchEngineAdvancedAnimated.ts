import SearchEngineAdvanced from 'geopf-extensions-openlayers/src/packages/Controls/SearchEngine/SearchEngineAdvanced.js'
import type Feature from 'ol/Feature'

type SearchResultEvent = {
  center?: boolean
  result?: unknown
  extent?: unknown
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
    const proto = SearchEngineAdvanced.prototype as SearchEngineAdvancedProto
    if (e.center !== false) {
      proto.addResultToMap.call(this, { ...e, center: false })
      return
    }
    proto.addResultToMap.call(this, e)
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

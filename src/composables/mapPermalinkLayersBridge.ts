import { shallowRef } from 'vue'
import type { MapPermalinkParams } from '@/lib/map/mapPermalink'

export interface MapPermalinkLayersBridge {
  applyLayerParamsFromPermalink: (params: MapPermalinkParams) => void
  collectLayerParamsForPermalink: () => MapPermalinkParams
}

export const mapPermalinkLayersBridgeRef = shallowRef<MapPermalinkLayersBridge | null>(null)

export function registerMapPermalinkLayersBridge(api: MapPermalinkLayersBridge | null): void {
  mapPermalinkLayersBridgeRef.value = api
}

/** Démontage : n’efface que si cette passerelle est encore l’enregistrée. */
export function unregisterMapPermalinkLayersBridge(api: MapPermalinkLayersBridge): void {
  if (mapPermalinkLayersBridgeRef.value === api) mapPermalinkLayersBridgeRef.value = null
}

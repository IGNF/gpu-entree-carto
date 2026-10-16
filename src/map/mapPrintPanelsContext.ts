import { shallowRef, type InjectionKey, type Ref, type ShallowRef } from 'vue'
import type { ManagedLayer } from '@/composables/managedLayers'
import type { FicheInfoSelection } from '@/composables/tabPanels'

/** Données panneaux (fiche / légendes) pour l’impression — enregistrées par `TabPanelsControl`. */
export type MapPrintPanelsContext = {
  selection: Ref<FicheInfoSelection | null>
  legendLayers: Ref<ManagedLayer[]>
  mapZoom: Ref<number>
  catalogEntryInZoomRange: (layerId: string, zoom: number) => boolean
}

export const mapPrintPanelsKey: InjectionKey<MapPrintPanelsContext> = Symbol('mapPrintPanels')

/** Registre global (`MapPrintModal` est frère de `TabPanelsControl`, pas descendant). */
export const mapPrintPanelsRef: ShallowRef<MapPrintPanelsContext | null> = shallowRef(null)

export function registerMapPrintPanels(ctx: MapPrintPanelsContext | null): void {
  mapPrintPanelsRef.value = ctx
}

import type { InjectionKey } from 'vue'

/** Préréglages à l’ouverture (ex. bouton Imprimer depuis la fiche info). */
export type MapPrintModalOpenOptions = {
  hasTerritoryFiche?: boolean
  hasParcelFiche?: boolean
  hasLegends?: boolean
  hasAllLegends?: boolean
}

/** API modale impression (hôte démo / embed, comme `CartoAndTools` + `PrintModal`). */
export type MapPrintModalApi = {
  open: (options?: MapPrintModalOpenOptions) => void
  close: () => void
}

export const mapPrintModalKey: InjectionKey<MapPrintModalApi> = Symbol('mapPrintModal')

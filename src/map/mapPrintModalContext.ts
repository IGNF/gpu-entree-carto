import type { InjectionKey } from 'vue'

/** API modale impression (hôte démo / embed, comme `CartoAndTools` + `PrintModal`). */
export type MapPrintModalApi = {
  open: () => void
  close: () => void
}

export const mapPrintModalKey: InjectionKey<MapPrintModalApi> = Symbol('mapPrintModal')

import { inject, provide, type InjectionKey, type Ref } from 'vue'
import type { GpuBaseLayerId, GpuBaseLayerPreset } from '@/ol/gpuBaseLayerPresets'

export interface MapPermalinkUiContext {
  presets: GpuBaseLayerPreset[]
  getActiveBaseId: () => GpuBaseLayerId
  setActiveBaseId: (id: GpuBaseLayerId) => void
  /** Réactif — sync permalink `tile` à chaque changement de fond. */
  activeBaseIdRef?: Ref<GpuBaseLayerId>
}

const MAP_PERMALINK_UI_KEY: InjectionKey<MapPermalinkUiContext> = Symbol('mapPermalinkUi')

export function provideMapPermalinkUi(ctx: MapPermalinkUiContext): void {
  provide(MAP_PERMALINK_UI_KEY, ctx)
}

export function useMapPermalinkUi(): MapPermalinkUiContext | null {
  return inject(MAP_PERMALINK_UI_KEY) ?? null
}

export function tileIndexFromBaseId(presets: GpuBaseLayerPreset[], id: GpuBaseLayerId): number {
  const idx = presets.findIndex((p) => p.id === id)
  return idx >= 0 ? idx + 1 : 1
}

export function baseIdFromTileIndex(
  presets: GpuBaseLayerPreset[],
  tile: number,
): GpuBaseLayerId | null {
  const preset = presets[tile - 1]
  return preset?.id ?? null
}

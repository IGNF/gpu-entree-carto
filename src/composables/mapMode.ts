import { inject, provide, ref, watch, type Ref } from 'vue'
import {
  DEFAULT_MAP_MODE,
  normalizeMapModes,
  resolveEnabledMapMode,
  readMapModeFromPermalinkHash,
  readMapModeFromSearchParams,
  writeMapModeToLocation,
  type MapModeId,
} from '@/lib/map/mapMode'

const MAP_MODE_KEY = Symbol('mapMode')

export interface MapModeContext {
  mode: Ref<MapModeId>
  /** Modes activés par la config, dans l’ordre du sélecteur. */
  modes: readonly MapModeId[]
  setMode: (next: MapModeId) => void
}

function resolveInitialMapMode(fallback?: MapModeId): MapModeId {
  if (typeof window === 'undefined') return fallback ?? DEFAULT_MAP_MODE
  return (
    readMapModeFromPermalinkHash(window.location.hash) ??
    readMapModeFromSearchParams(window.location.search) ??
    fallback ??
    DEFAULT_MAP_MODE
  )
}

export function provideMapMode(options?: {
  initial?: MapModeId
  syncUrl?: boolean
  /** Modes proposés (config) ; absent = les trois. */
  modes?: unknown
}): MapModeContext {
  const syncUrl = options?.syncUrl !== false
  const modes = normalizeMapModes(options?.modes)
  // Permalien, accueil ou config sur un mode non proposé : repli sur un mode activé.
  const mode = ref<MapModeId>(resolveEnabledMapMode(resolveInitialMapMode(options?.initial), modes))

  const setMode = (next: MapModeId): void => {
    if (mode.value === next || !modes.includes(next)) return
    mode.value = next
  }

  if (syncUrl && typeof window !== 'undefined') {
    watch(
      mode,
      (value) => {
        writeMapModeToLocation(value)
      },
      { flush: 'post', immediate: true },
    )
  }

  const ctx: MapModeContext = { mode, modes, setMode }
  provide(MAP_MODE_KEY, ctx)
  return ctx
}

export function useMapMode(): MapModeContext {
  const ctx = inject<MapModeContext>(MAP_MODE_KEY)
  if (!ctx) {
    throw new Error('[useMapMode] provideMapMode() manquant sur la vue carte')
  }
  return ctx
}

export function tryUseMapMode(): MapModeContext | null {
  return inject<MapModeContext>(MAP_MODE_KEY) ?? null
}

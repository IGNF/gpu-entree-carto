import type { GpuLayerCatalogEntry } from '@/lib/layerConfig/gpuLayerConfig'
import { pathToPermalinkId } from '@/lib/map/mapPermalink'

/** gpu-client : `v:w:x:y:z` (catalogue, opacité, pile, gris, visibilité panneau). */
export type LayerPermalinkState = {
  /** v — case catalogue */
  checked: boolean
  /** w — opacité 0–1 */
  opacity: number
  /** x — index pile Couches de données (0 = haut) */
  stackIndex: number
  /** y — niveaux de gris (0 couleur, 1 gris) */
  grayscale: boolean
  /** z — visible sur la carte dans le panneau (1 affichée, 0 masquée) */
  visible: boolean
}

export function formatPermalinkOpacity(opacity: number): string {
  const n = Math.min(1, Math.max(0, opacity))
  const rounded = Math.round(n * 100) / 100
  return String(rounded)
}

export function decodeLayerPermalinkValue(raw: string): LayerPermalinkState | null {
  const parts = raw.split(':')
  if (parts.length < 2) return null
  const head = parts[0]
  if (head !== '0' && head !== '1') return null
  const checked = head === '1'
  const opacity = Number(parts[1])
  const stackIndex = parts.length >= 3 ? Number(parts[2]) : 0
  if (!Number.isFinite(opacity)) return null

  if (parts.length >= 5) {
    const grayscale = parts[3] === '1'
    const visible = parts[4] === '1'
    return {
      checked,
      opacity,
      stackIndex: Number.isFinite(stackIndex) ? stackIndex : 0,
      grayscale,
      visible,
    }
  }

  // Legacy 4 segments (v:w:x:y) — y = gris ; visibilité = 1 si coché catalogue
  const grayscale = parts.length >= 4 ? parts[3] === '1' : false
  return {
    checked,
    opacity,
    stackIndex: Number.isFinite(stackIndex) ? stackIndex : 0,
    grayscale,
    visible: checked,
  }
}

export function encodeLayerPermalinkValue(state: LayerPermalinkState): string {
  const v = state.checked ? 1 : 0
  const w = formatPermalinkOpacity(state.opacity)
  const x = state.stackIndex
  const y = state.grayscale ? 1 : 0
  const z = state.visible ? 1 : 0
  return `${v}:${w}:${x}:${y}:${z}`
}

/** Clés permalink gpu-client pour une entrée catalogue (alias `scot`, chemins `a,b`). */
export function permalinkIdsForCatalogEntry(entry: GpuLayerCatalogEntry): string[] {
  const ids = new Set<string>()
  const parts = entry.path.split('/').filter(Boolean)
  if (parts.length) {
    ids.add(parts.join(','))
    ids.add(parts[parts.length - 1]!)
  }
  const legacy = pathToPermalinkId(entry.path)
  if (legacy) ids.add(legacy)
  const name = entry.config.name?.trim()
  if (name) ids.add(name)
  return [...ids]
}

function shouldPreferPermalinkTarget(
  current: GpuLayerCatalogEntry,
  existing: GpuLayerCatalogEntry,
): boolean {
  const curLegend = Boolean(current.config.onlyLegend)
  const exLegend = Boolean(existing.config.onlyLegend)
  if (curLegend && !exLegend) return false
  if (!curLegend && exLegend) return true
  return current.path.length < existing.path.length
}

export function buildCatalogIdByPermalinkId(entries: GpuLayerCatalogEntry[]): Map<string, string> {
  const byId = new Map(entries.map((e) => [e.id, e]))
  const map = new Map<string, string>()
  for (const entry of entries) {
    for (const permalinkId of permalinkIdsForCatalogEntry(entry)) {
      const prevId = map.get(permalinkId)
      if (!prevId) {
        map.set(permalinkId, entry.id)
        continue
      }
      const prevEntry = byId.get(prevId)
      if (prevEntry && shouldPreferPermalinkTarget(entry, prevEntry)) {
        map.set(permalinkId, entry.id)
      }
    }
  }
  return map
}

export function defaultOpacityFromCatalogEntry(entry: GpuLayerCatalogEntry): number {
  if (typeof entry.config.opacity === 'number' && Number.isFinite(entry.config.opacity)) {
    return entry.config.opacity
  }
  return 0.7
}

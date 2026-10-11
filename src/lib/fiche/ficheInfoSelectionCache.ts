import type { FicheInfoSelection } from '@/composables/tabPanels'
import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import { resolveParcelIdFromRaw } from '@/lib/fiche/parcelId'

export function territoryCacheKeyFromPayload(data: GpuFicheInfoPayload): string | null {
  const insee = data.grid?.insee?.trim()
  const name = data.grid?.name?.trim()
  if (!insee && !name) return null
  return `${insee ?? ''}|${name ?? ''}`
}

export function parcelCacheKeyFromPayload(data: GpuFicheInfoPayload): string | null {
  const extended = data as GpuFicheInfoPayload & { parcelId?: string }
  return resolveParcelIdFromRaw({
    parcel: data.parcel ?? undefined,
    parcelId: extended.parcelId,
  })
}

const territorySelectionByKey = new Map<string, FicheInfoSelection>()
const parcelSelectionByKey = new Map<string, FicheInfoSelection>()
let lastTerritoryKey: string | null = null
let lastParcelKey: string | null = null

export function rememberFicheSelectionCaches(
  data: GpuFicheInfoPayload,
  territorySelection: FicheInfoSelection | null,
  parcelSelection: FicheInfoSelection | null,
): void {
  const tKey = territoryCacheKeyFromPayload(data)
  if (tKey && territorySelection) {
    territorySelectionByKey.set(tKey, territorySelection)
    lastTerritoryKey = tKey
  }
  const pKey = parcelCacheKeyFromPayload(data)
  if (pKey && parcelSelection) {
    parcelSelectionByKey.set(pKey, parcelSelection)
    lastParcelKey = pKey
  }
}

export function getCachedTerritorySelection(data: GpuFicheInfoPayload): FicheInfoSelection | null {
  const key = territoryCacheKeyFromPayload(data)
  if (!key) return null
  return territorySelectionByKey.get(key) ?? null
}

export function getCachedParcelSelection(data: GpuFicheInfoPayload): FicheInfoSelection | null {
  const key = parcelCacheKeyFromPayload(data)
  if (!key) return null
  return parcelSelectionByKey.get(key) ?? null
}

/** Même territoire qu’au dernier chargement (indice client pour éviter refetch territoire). */
export function isSameTerritoryAsLast(data: GpuFicheInfoPayload): boolean {
  const key = territoryCacheKeyFromPayload(data)
  return Boolean(key && key === lastTerritoryKey && territorySelectionByKey.has(key))
}

/** Même parcelle qu’au dernier chargement. */
export function isSameParcelAsLast(data: GpuFicheInfoPayload): boolean {
  const key = parcelCacheKeyFromPayload(data)
  return Boolean(key && key === lastParcelKey && parcelSelectionByKey.has(key))
}

export function clearFicheSelectionCachesForTests(): void {
  territorySelectionByKey.clear()
  parcelSelectionByKey.clear()
  lastTerritoryKey = null
  lastParcelKey = null
}

import type { FicheInfoSelection } from '@/composables/tabPanels'
import type { GpuParcelFichePayload } from '@/lib/fiche/parcelFicheFromGpuApi'
import { resolveParcelIdFromRaw } from '@/lib/fiche/parcelId'

export type ParcelFicheDetailCacheEntry = {
  parcelId: string
  parcelFiche: GpuParcelFichePayload
  parcelInfosHtml: string
  parcelDocumentsHtml: string
}

const parcelDetailById = new Map<string, ParcelFicheDetailCacheEntry>()

export function parcelIdFromSelection(selection: FicheInfoSelection | null): string | null {
  if (!selection?.raw || typeof selection.raw !== 'object') return null
  return resolveParcelIdFromRaw(selection.raw)
}

export function getParcelFicheDetailCache(parcelId: string): ParcelFicheDetailCacheEntry | null {
  return parcelDetailById.get(parcelId) ?? null
}

export function storeParcelFicheDetailCache(entry: ParcelFicheDetailCacheEntry): void {
  parcelDetailById.set(entry.parcelId, entry)
}

/** Réinjecte Infos/Documents déjà chargés pour la même parcelle (clé `parcelId`). */
export function applyParcelFicheDetailCache(selection: FicheInfoSelection): FicheInfoSelection {
  const parcelId = parcelIdFromSelection(selection)
  if (!parcelId) return selection
  const cached = getParcelFicheDetailCache(parcelId)
  if (!cached) return selection

  const raw: Record<string, unknown> = {
    ...(selection.raw && typeof selection.raw === 'object' ? selection.raw : {}),
    parcelId,
    _parcelFiche: cached.parcelFiche,
  }

  return {
    ...selection,
    raw,
    parcelInfosHtml: cached.parcelInfosHtml,
    parcelDocumentsHtml: cached.parcelDocumentsHtml,
  }
}

/** Vide le cache (tests). */
export function clearParcelFicheDetailCacheForTests(): void {
  parcelDetailById.clear()
}

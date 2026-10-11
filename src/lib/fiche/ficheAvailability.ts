import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'

export const NO_PARCEL_AT_POINT_MESSAGE = 'Pas de parcelle à cet emplacement.'

export function ficheHasParcelAtPoint(data: GpuFicheInfoPayload): boolean {
  if (typeof data.parcelId === 'string' && data.parcelId.trim()) return true
  if (data.parcelGeometry) return true
  const parcel = data.parcel
  if (!parcel || typeof parcel !== 'object') return false
  const p = parcel
  if (typeof p.id === 'string' && p.id.trim()) return true
  return Boolean(p.numero ?? p.section ?? p.code_com ?? p.code_insee)
}

export function ficheHasTerritoryAtPoint(data: GpuFicheInfoPayload): boolean {
  const grid = data.grid
  if (!grid || typeof grid !== 'object') return false
  return Boolean(grid.insee || grid.name)
}

import { ficheHasParcelAtPoint } from '@/lib/fiche/ficheAvailability'
import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'

/** Métadonnées parcelle au point (CTA retour parcelle), sans remplacer le contenu territoire. */
export function mergeParcelHintIntoTerritoryPayload(
  territory: GpuFicheInfoPayload,
  parcelScope: GpuFicheInfoPayload,
): GpuFicheInfoPayload {
  if (ficheHasParcelAtPoint(territory)) return territory
  if (!ficheHasParcelAtPoint(parcelScope)) return territory

  const merged: GpuFicheInfoPayload = { ...territory }
  if (parcelScope.parcel) merged.parcel = parcelScope.parcel
  if (typeof parcelScope.parcelId === 'string' && parcelScope.parcelId.trim()) {
    merged.parcelId = parcelScope.parcelId
  }
  if (parcelScope.parcelGeometry) merged.parcelGeometry = parcelScope.parcelGeometry
  if (typeof parcelScope.territoryParcelId === 'string' && parcelScope.territoryParcelId.trim()) {
    merged.territoryParcelId = parcelScope.territoryParcelId
  }
  return merged
}

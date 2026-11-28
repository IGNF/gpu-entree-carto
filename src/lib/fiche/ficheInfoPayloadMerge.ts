import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import type { GpuParcelFichePayload, ParcelFicheFeature } from '@/lib/fiche/parcelFicheFromGpuApi'
import { isGpuParcelFichePayload } from '@/lib/fiche/parcelFicheFromGpuApi'

type GpuFichePartitionField = NonNullable<GpuFicheInfoPayload['dus']>

function mergeRecordPartitions(
  base: GpuFichePartitionField | undefined,
  extra: GpuFichePartitionField | undefined,
): GpuFichePartitionField | undefined {
  if (!extra) return base
  if (Array.isArray(extra)) return extra.length ? extra : base
  if (!base || Array.isArray(base)) return Object.keys(extra).length ? extra : base
  if (!Object.keys(extra).length) return base
  return { ...base, ...extra }
}

function mergeProcedureMaps(
  base: GpuFicheInfoPayload['proceduresByDocument'],
  extra: GpuFicheInfoPayload['proceduresByDocument'],
): GpuFicheInfoPayload['proceduresByDocument'] {
  if (!extra) return base
  if (!base) return { ...extra }
  const out = { ...base }
  for (const [key, list] of Object.entries(extra)) {
    const prev = out[key] ?? []
    const seen = new Set(prev.map((p) => p.id ?? p.name))
    const merged = [...prev]
    for (const proc of list) {
      const id = proc.id ?? proc.name
      if (id && seen.has(id)) continue
      if (id) seen.add(id)
      merged.push(proc)
    }
    out[key] = merged
  }
  return out
}

function mergeParcelFiche(
  base: GpuParcelFichePayload | undefined,
  extra: GpuParcelFichePayload | undefined,
): GpuParcelFichePayload | undefined {
  if (!extra) return base
  if (!base) return extra
  const byId = new Map<string, ParcelFicheFeature>()
  for (const f of base.features ?? []) {
    const id = typeof f.id === 'string' ? f.id : ''
    if (id) byId.set(id, f)
  }
  for (const f of extra.features ?? []) {
    const id = typeof f.id === 'string' ? f.id : ''
    if (id) byId.set(id, f)
  }
  return { features: [...byId.values()] }
}

function hasLowScaleDocuments(value: GpuFicheInfoPayload['lowScaleDocument']): boolean {
  if (!value) return false
  return Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0
}

/** Fusionne une réponse partielle (activeFamilies restreint) dans le JSON déjà en cache au point. */
export function mergeGpuFicheInfoPayloads(
  base: GpuFicheInfoPayload,
  partial: GpuFicheInfoPayload,
): GpuFicheInfoPayload {
  const merged: GpuFicheInfoPayload = { ...base }

  merged.dus = mergeRecordPartitions(base.dus, partial.dus)
  merged.psmvs = mergeRecordPartitions(base.psmvs, partial.psmvs)
  merged.sups = mergeRecordPartitions(base.sups, partial.sups)
  merged.scots = mergeRecordPartitions(base.scots, partial.scots)
  merged.mecsDu = mergeRecordPartitions(base.mecsDu, partial.mecsDu)
  merged.mecsScot = mergeRecordPartitions(base.mecsScot, partial.mecsScot)
  // complément sans du : lowScaleDocument vide, documents DU déjà connus conservés
  if (hasLowScaleDocuments(partial.lowScaleDocument))
    merged.lowScaleDocument = partial.lowScaleDocument
  merged.proceduresByDocument = mergeProcedureMaps(
    base.proceduresByDocument,
    partial.proceduresByDocument,
  )
  merged.notUnforceableByDocument = {
    ...base.notUnforceableByDocument,
    ...partial.notUnforceableByDocument,
  }

  merged.grid = partial.grid ?? base.grid
  merged.parcel = partial.parcel ?? base.parcel
  merged.parcelId = partial.parcelId ?? base.parcelId
  merged.territoryParcelId = partial.territoryParcelId ?? base.territoryParcelId
  merged.parcelGeometry = partial.parcelGeometry ?? base.parcelGeometry
  merged.gridGeometry = partial.gridGeometry ?? base.gridGeometry
  merged.parentGridGeometry = partial.parentGridGeometry ?? base.parentGridGeometry
  merged.typeref = partial.typeref ?? base.typeref
  // null : zone d’alerte EL9 non interrogée (complément sans sup) ou en échec, valeur déjà connue conservée
  if (typeof partial.is_el9_alert === 'boolean') merged.is_el9_alert = partial.is_el9_alert

  const parcelBase = isGpuParcelFichePayload(base.parcelFiche) ? base.parcelFiche : undefined
  const parcelExtra = isGpuParcelFichePayload(partial.parcelFiche) ? partial.parcelFiche : undefined
  const parcelMerged = mergeParcelFiche(parcelBase, parcelExtra)
  if (parcelMerged) merged.parcelFiche = parcelMerged

  // Mode Coordonnées : règles au point, même format et même fusion que la fiche parcelle.
  const pointMerged = mergeParcelFiche(
    isGpuParcelFichePayload(base.pointFiche) ? base.pointFiche : undefined,
    isGpuParcelFichePayload(partial.pointFiche) ? partial.pointFiche : undefined,
  )
  if (pointMerged) merged.pointFiche = pointMerged

  return merged
}

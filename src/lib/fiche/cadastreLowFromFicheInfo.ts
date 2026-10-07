import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import { resetGpuCadastreLowLayer, getGpuCadastreLowLayer } from '@/ol/gpuCadastreLowLayer'

type GpuFicheDocument = {
  typeref?: string | null
  status?: string
}

function typerefFromProductionDocuments(data: GpuFicheInfoPayload): string | null {
  const dus = data.dus
  if (!dus || Array.isArray(dus)) return null
  for (const partition of Object.values(dus)) {
    const docs = partition.documents
    if (!Array.isArray(docs)) continue
    for (const doc of docs) {
      const d = doc as GpuFicheDocument
      if (d.status === 'document.production' && d.typeref != null && String(d.typeref).trim()) {
        return String(d.typeref).trim()
      }
    }
  }
  return null
}

export function resolveTyperefForCadastre(data: GpuFicheInfoPayload): string | null {
  const root = data.typeref
  if (typeof root === 'string' && root.trim()) return root.trim()
  return typerefFromProductionDocuments(data)
}

/** INSEE commune (gpu-client : `grid.insee` ou `parcel.code_insee`). */
export function resolveInseeForCadastre(data: GpuFicheInfoPayload): string | null {
  const fromGrid = data.grid?.insee
  if (typeof fromGrid === 'string' && fromGrid.trim()) return fromGrid.trim()
  const parcel = data.parcel
  const fromParcel = parcel?.code_insee
  if (typeof fromParcel === 'string' && fromParcel.trim()) return fromParcel.trim()
  if (typeof fromParcel === 'number' && Number.isFinite(fromParcel)) {
    return String(fromParcel).padStart(5, '0')
  }
  return null
}

export function applyCadastreLowFromFichePayload(
  data: GpuFicheInfoPayload | null | undefined,
): void {
  const layer = getGpuCadastreLowLayer()
  if (!layer || !data) {
    resetGpuCadastreLowLayer()
    return
  }
  /* Aligné gpu-client createStandardViewer (getinfo:end) : sans grille commune → PCI Express. */
  if (!data.grid) {
    resetGpuCadastreLowLayer()
    return
  }
  const insee = data.grid.insee?.trim() || resolveInseeForCadastre(data)
  layer.setInseeCommune(insee, resolveTyperefForCadastre(data))
}

export function syncCadastreLowFromFicheSelectionRaw(
  raw: Record<string, unknown> | null | undefined,
): void {
  if (!raw || raw.source !== 'gpu-fiche-info-api') {
    resetGpuCadastreLowLayer()
    return
  }
  applyCadastreLowFromFichePayload(raw as GpuFicheInfoPayload)
}

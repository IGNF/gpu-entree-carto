import type { Geometry } from 'geojson'
import type { GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import {
  MAP_MODE_PARCEL,
  MAP_MODE_TERRITORY,
  normalizeMapMode,
  type MapModeId,
} from '@/lib/map/mapMode'
import { isMunicipalArrondissementInsee } from '@/lib/map/municipalArrondissement'
import type { ModeEmpriseKind } from '@/lib/map/searchResultGraphics'

export type ModeEmpriseGeometryPart = {
  kind: ModeEmpriseKind
  geometry: Geometry
}

function readGeometry(value: unknown): Geometry | null {
  if (!value || typeof value !== 'object') return null
  const g = value as Geometry
  return typeof g.type === 'string' ? g : null
}

function gridInseeFromPayload(payload: GpuFicheInfoPayload): string {
  const grid = payload.grid
  if (!grid || typeof grid !== 'object') return ''
  const insee = grid.insee
  return typeof insee === 'string' ? insee : ''
}

function parcelGeometryFromPayload(payload: GpuFicheInfoPayload): Geometry | null {
  const direct = readGeometry(payload.parcelGeometry)
  if (direct) return direct
  const raw = payload as Record<string, unknown>
  const parcelFeature = raw.parcelFeature
  if (parcelFeature && typeof parcelFeature === 'object') {
    return readGeometry((parcelFeature as { geometry?: unknown }).geometry)
  }
  return null
}

/** Géométries mode emprise à partir du JSON fiche-info (v2 gpu-site). */
export function modeEmprisePartsFromFichePayload(
  payload: GpuFicheInfoPayload,
  mode: MapModeId,
): ModeEmpriseGeometryPart[] {
  const resolvedMode = normalizeMapMode(mode) ?? MAP_MODE_TERRITORY

  if (resolvedMode === MAP_MODE_PARCEL) {
    const geometry = parcelGeometryFromPayload(payload)
    return geometry ? [{ kind: 'parcel', geometry }] : []
  }

  if (resolvedMode !== MAP_MODE_TERRITORY) return []

  const insee = gridInseeFromPayload(payload)
  const parentGeometry = readGeometry(payload.parentGridGeometry)
  const gridGeometry = readGeometry(payload.gridGeometry)
  const parts: ModeEmpriseGeometryPart[] = []

  if (parentGeometry) {
    parts.push({ kind: 'commune', geometry: parentGeometry })
  }

  if (gridGeometry) {
    const kind: ModeEmpriseKind =
      parentGeometry && insee && isMunicipalArrondissementInsee(insee)
        ? 'arrondissement'
        : 'commune'
    parts.push({ kind, geometry: gridGeometry })
  }

  return parts
}

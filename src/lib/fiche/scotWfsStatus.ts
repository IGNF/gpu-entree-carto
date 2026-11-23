/**
 * État d’affichage d’un SCoT WFS (couche carte, légende parcelle, fiche info).
 * Aligné sur les styles WMS : `gpu_id` → publié ; `approved` vrai → non publié ; sinon → arrêté.
 * Port du helper gpu-client `scotWfsStatus.js`.
 */
import { coerceDisplayString } from '@/lib/coerceDisplayString'

export type ScotWfsDisplayState = 'published' | 'not_published' | 'stopped'

/** SCoT présent dans les données carte mais sans document en base. */
export type ScotWfsUnpublishedState = Exclude<ScotWfsDisplayState, 'published'>

export function parseScotApprovedValue(value: unknown): boolean | null {
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return null
}

export function hasScotGpuId(properties: Record<string, unknown> | null | undefined): boolean {
  return coerceDisplayString(properties?.gpu_id).trim() !== ''
}

export function resolveScotWfsDisplayState(
  properties: Record<string, unknown> | null | undefined,
): ScotWfsDisplayState {
  if (hasScotGpuId(properties)) return 'published'
  if (parseScotApprovedValue(properties?.approved) === true) return 'not_published'
  return 'stopped'
}

export function isScotWfsUnpublishedState(
  state: ScotWfsDisplayState,
): state is ScotWfsUnpublishedState {
  return state === 'not_published' || state === 'stopped'
}

export function resolveScotLegendImageKey(
  properties: Record<string, unknown> | null | undefined,
): 'SCOT_PUBLISHED' | 'SCOT_NOT_PUBLISHED' | 'SCOT_PERIMETER' {
  const state = resolveScotWfsDisplayState(properties)
  if (state === 'published') return 'SCOT_PUBLISHED'
  if (state === 'not_published') return 'SCOT_NOT_PUBLISHED'
  return 'SCOT_PERIMETER'
}

export function getScotLegendImagePath(
  layer: string,
  properties: Record<string, unknown> | null | undefined,
): string {
  return `${layer}/${resolveScotLegendImageKey(properties)}.png`
}

/** Libellé de légende fiche parcelle (titre WFS + suffixe éventuel). */
export function formatScotParcelLegendTitle(
  title: string | null | undefined,
  properties: Record<string, unknown> | null | undefined,
): string {
  const base = title?.trim() || 'SCOT'
  const state = resolveScotWfsDisplayState(properties)
  if (state === 'not_published') return `${base} - non publié`
  if (state === 'stopped') return `${base} - arrêté`
  return base
}

/** Libellé du badge gris de la tuile document SCoT. */
export function scotWfsStatusBadgeLabel(state: ScotWfsUnpublishedState): string {
  return state === 'not_published' ? 'NON PUBLIÉ' : 'ARRÊTÉ'
}

/** Message explicatif (repris du bandeau gpu-client). */
export function scotWfsStatusBannerMessage(state: ScotWfsUnpublishedState): string {
  if (state === 'not_published') {
    return "Ce schéma de cohérence territoriale n'est pas encore publié sur le Géoportail de l'urbanisme."
  }
  return 'Ce schéma de cohérence territoriale est arrêté.'
}

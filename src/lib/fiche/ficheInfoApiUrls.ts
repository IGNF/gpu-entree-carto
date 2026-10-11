import config from '@/lib/config'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'

export type FicheInfoEndpointKind = 'combined' | 'territoire' | 'parcelle'

function readConfigUrl(key: string): string | null {
  const bag: Record<string, unknown> = config
  const raw = bag[key]
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length ? trimmed : null
}

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/$/, '')
}

/** `true` si les URLs v2 territoire/parcelle sont dérivées ou configurées explicitement. */
export function ficheInfoUsesV2SplitEndpoints(base: string): boolean {
  const normalized = normalizeBaseUrl(base)
  if (normalized.includes('fiche-info-v2')) return true
  return Boolean(
    readConfigUrl('apiFicheInfoTerritoireUrl') || readConfigUrl('apiFicheInfoParcelleUrl'),
  )
}

/**
 * Résout l’URL d’appel fiche-info (v2 ou legacy `/api/fiche-info`).
 * Legacy : une seule URL + paramètre `mode`.
 */
export function resolveFicheInfoEndpointUrl(kind: FicheInfoEndpointKind): string | null {
  if (kind === 'combined') {
    const combined = readConfigUrl('apiFicheInfoCombinedUrl')
    if (combined) return combined
  }
  if (kind === 'territoire') {
    const explicit = readConfigUrl('apiFicheInfoTerritoireUrl')
    if (explicit) return explicit
  }
  if (kind === 'parcelle') {
    const explicit = readConfigUrl('apiFicheInfoParcelleUrl')
    if (explicit) return explicit
  }

  const base = readConfigUrl('apiFicheInfoUrl')
  if (!base) return null
  const normalized = normalizeBaseUrl(base)

  if (!normalized.includes('fiche-info-v2')) {
    return normalized
  }

  if (kind === 'combined') {
    if (normalized.endsWith('/territoire') || normalized.endsWith('/parcelle')) {
      return normalized.replace(/\/(territoire|parcelle)$/, '')
    }
    return normalized
  }

  const suffix = kind === 'territoire' ? 'territoire' : 'parcelle'
  if (normalized.endsWith('/territoire') || normalized.endsWith('/parcelle')) {
    return normalized.replace(/\/(territoire|parcelle)$/, `/${suffix}`)
  }
  return `${normalized}/${suffix}`
}

export function resolveFicheInfoFetchUrl(mode: MapModeId): string | null {
  const preferCombined = readConfigUrl('apiFicheInfoCombinedUrl')
  if (preferCombined) return preferCombined

  const base = readConfigUrl('apiFicheInfoUrl')
  if (base && ficheInfoUsesV2SplitEndpoints(base)) {
    return resolveFicheInfoEndpointUrl('combined')
  }

  if (base) return normalizeBaseUrl(base)

  return resolveFicheInfoEndpointUrl(mode === MAP_MODE_TERRITORY ? 'territoire' : 'parcelle')
}

/** Legacy : ajouter `mode` en query ; v2 : chemin suffit. */
export function shouldAppendLegacyFicheModeParam(resolvedUrl: string): boolean {
  return !resolvedUrl.includes('fiche-info-v2')
}

export function legacyFicheModeValue(mode: MapModeId): string {
  return mode === MAP_MODE_PARCEL ? String(MAP_MODE_PARCEL) : String(MAP_MODE_TERRITORY)
}

import config from '@/lib/config'
import { MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'

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

/**
 * Résout l’URL d’appel fiche-info gpu-site : `apiFicheInfoUrl` (combinée),
 * `…/territoire` et `…/parcelle` dérivées, sauf URL explicite dans la config.
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

/** URL combinée (territoire + parcelle en un appel). */
export function resolveFicheInfoCombinedFetchUrl(): string | null {
  return resolveFicheInfoEndpointUrl('combined')
}

/**
 * Un seul fetch combiné pour alimenter les deux modes en cache (gpu-site).
 * Désactivable via `gpu.config.apiFicheInfoPreferCombined = false`.
 */
export function preferFicheInfoV2CombinedFetch(): boolean {
  if (!resolveFicheInfoCombinedFetchUrl()) return false
  const bag = config as { apiFicheInfoPreferCombined?: boolean }
  return bag.apiFicheInfoPreferCombined !== false
}

export function resolveFicheInfoFetchUrl(mode: MapModeId): string | null {
  return resolveFicheInfoEndpointUrl(mode === MAP_MODE_TERRITORY ? 'territoire' : 'parcelle')
}

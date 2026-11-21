import config from '@/lib/config'
import { isFicheDocumentFamilyVisible } from '@/lib/fiche/ficheCatalogVisibilityFilter'
import { preferFicheInfoV2CombinedFetch } from '@/lib/fiche/ficheInfoApiUrls'
import { MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'

/** Familles acceptées par `ApiFicheInfoQuery` (gpu-site). */
export type FicheInfoApiFamily = 'du' | 'sup' | 'scot'

const ALL_API_FAMILIES: FicheInfoApiFamily[] = ['du', 'sup', 'scot']

function readConfigFlag(): boolean {
  const bag = config as { apiFicheInfoCatalogFamilies?: boolean }
  if (bag.apiFicheInfoCatalogFamilies === false) return false
  const apiUrl = (config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl
  return preferFicheInfoV2CombinedFetch() || Boolean(apiUrl?.includes('fiche-info-v2'))
}

/** Active le filtrage WFS/BDD par cases catalogue (v2). Défaut : true si fiche-info-v2. */
export function isCatalogDrivenFicheFetchEnabled(): boolean {
  return readConfigFlag()
}

/** Familles à demander au serveur selon le catalogue Données (du/psmv/mec → `du`). */
export function resolveFicheInfoActiveFamiliesForFetch(): FicheInfoApiFamily[] {
  if (!isCatalogDrivenFicheFetchEnabled()) {
    return [...ALL_API_FAMILIES]
  }

  const families: FicheInfoApiFamily[] = []
  if (
    isFicheDocumentFamilyVisible('du') ||
    isFicheDocumentFamilyVisible('psmv') ||
    isFicheDocumentFamilyVisible('mec')
  ) {
    families.push('du')
  }
  if (isFicheDocumentFamilyVisible('sup')) families.push('sup')
  if (isFicheDocumentFamilyVisible('scot')) families.push('scot')

  return families.length ? families : ['du']
}

export function missingFicheInfoFamilies(
  desired: FicheInfoApiFamily[],
  acquired: readonly FicheInfoApiFamily[],
): FicheInfoApiFamily[] {
  const have = new Set(acquired)
  return desired.filter((f) => !have.has(f))
}

export function familiesAcquisitionSatisfied(
  desired: FicheInfoApiFamily[],
  acquired: readonly FicheInfoApiFamily[],
): boolean {
  return missingFicheInfoFamilies(desired, acquired).length === 0
}

export function unionFicheInfoFamilies(
  a: readonly FicheInfoApiFamily[],
  b: readonly FicheInfoApiFamily[],
): FicheInfoApiFamily[] {
  return [...new Set([...a, ...b])] as FicheInfoApiFamily[]
}

/**
 * Territoire : un complément sup/scot sans `du` n’embarque pas le maillage WFS municipality —
 * gpu-site résout l’INSEE en base ; inclure `du` reste utile sur d’anciennes versions.
 */
export function familiesForTerritoryNetworkFetch(
  missing: FicheInfoApiFamily[],
  mode: MapModeId,
): FicheInfoApiFamily[] {
  if (mode !== MAP_MODE_TERRITORY || !missing.length) return missing
  if (
    missing.some((f) => f === 'sup' || f === 'scot') &&
    !missing.includes('du') &&
    isFicheDocumentFamilyVisible('du')
  ) {
    return unionFicheInfoFamilies(missing, ['du'])
  }
  return missing
}

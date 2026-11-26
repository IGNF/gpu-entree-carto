import config from '@/lib/config'
import {
  isFicheDocumentFamilyVisible,
  isFicheSupInZoomRange,
} from '@/lib/fiche/ficheCatalogVisibilityFilter'

/** Familles acceptées par `ApiFicheInfoQuery` (gpu-site). */
export type FicheInfoApiFamily = 'du' | 'sup' | 'scot'

const ALL_API_FAMILIES: FicheInfoApiFamily[] = ['du', 'sup', 'scot']

/** Active le filtrage WFS/BDD par cases catalogue. Désactivable via `apiFicheInfoCatalogFamilies = false`. */
export function isCatalogDrivenFicheFetchEnabled(): boolean {
  const bag = config as { apiFicheInfoCatalogFamilies?: boolean }
  return bag.apiFicheInfoCatalogFamilies !== false
}

/**
 * Familles à demander au serveur selon le catalogue Données :
 * `du` toujours (commune, MEC DU et SCoT au point) ; `sup` si la couche SUP est cochée et dans sa
 * plage de zoom (requêtes SUP limitées en débit côté gpu-site) ; `scot` si la couche SCoT est cochée.
 */
export function resolveFicheInfoActiveFamiliesForFetch(): FicheInfoApiFamily[] {
  if (!isCatalogDrivenFicheFetchEnabled()) {
    return [...ALL_API_FAMILIES]
  }

  const families: FicheInfoApiFamily[] = ['du']
  if (isFicheDocumentFamilyVisible('sup') && isFicheSupInZoomRange()) families.push('sup')
  if (isFicheDocumentFamilyVisible('scot')) families.push('scot')

  return families
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

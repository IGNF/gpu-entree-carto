import { isCatalogDrivenFicheFetchEnabled } from '@/lib/fiche/ficheActiveFamilies'
import { isFicheDocumentFamilyVisible } from '@/lib/fiche/ficheCatalogVisibilityFilter'
import { getFicheCatalogSupTypes } from '@/lib/fiche/ficheCatalogLayerScope'

/** Types SUP demandés au gpu-site (`activeSupTypes[]`), ou `null` = pas de filtre serveur. */
export function resolveFicheInfoActiveSupTypesForFetch(): string[] | null {
  if (!isCatalogDrivenFicheFetchEnabled()) return null
  if (!isFicheDocumentFamilyVisible('sup')) return null
  const types = getFicheCatalogSupTypes()
  if (!types?.size) return null
  return [...types].sort((a, b) => a.localeCompare(b))
}

export type AcquiredSupTypes = Set<string> | null

export function missingFicheInfoSupTypes(
  desired: string[] | null,
  acquired: AcquiredSupTypes,
): string[] {
  if (!desired?.length) return []
  if (acquired === null) return []
  return desired.filter((code) => !acquired.has(code.toUpperCase()))
}

export function supTypesAcquisitionSatisfied(
  desired: string[] | null,
  acquired: AcquiredSupTypes,
): boolean {
  return missingFicheInfoSupTypes(desired, acquired).length === 0
}

export function unionAcquiredSupTypes(
  acquired: AcquiredSupTypes,
  fetched: readonly string[] | null | undefined,
): AcquiredSupTypes {
  if (fetched === null) {
    return null
  }
  if (fetched === undefined || !fetched.length) {
    return acquired
  }
  if (acquired === null) {
    return null
  }
  const next = new Set(acquired)
  for (const code of fetched) {
    const key = code.trim().toUpperCase()
    if (key) next.add(key)
  }
  return next
}

/**
 * Types SUP à envoyer pour cette requête (complément catalogue ou premier chargement SUP).
 */
export function activeSupTypesForFetch(
  familiesToFetch: readonly string[],
  acquiredFamilies: readonly string[],
  acquiredSupTypes: AcquiredSupTypes,
): string[] | null {
  if (!familiesToFetch.includes('sup')) return null
  const desired = resolveFicheInfoActiveSupTypesForFetch()
  if (!desired?.length) return null

  const firstSupFamilyFetch = !acquiredFamilies.includes('sup')
  if (firstSupFamilyFetch) {
    return desired
  }

  const missing = missingFicheInfoSupTypes(desired, acquiredSupTypes)
  return missing.length ? missing : null
}

export function catalogFicheAcquisitionComplete(
  desiredFamilies: readonly string[],
  acquiredFamilies: readonly string[],
  acquiredSupTypes: AcquiredSupTypes,
): boolean {
  const desiredSup = resolveFicheInfoActiveSupTypesForFetch()
  const familiesOk = desiredFamilies.every((f) => acquiredFamilies.includes(f))
  const supOk = supTypesAcquisitionSatisfied(desiredSup, acquiredSupTypes)
  return familiesOk && supOk
}

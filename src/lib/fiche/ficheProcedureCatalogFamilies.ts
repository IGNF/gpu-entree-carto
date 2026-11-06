import {
  isFicheDocumentFamilyVisible,
  type FicheDocumentFamily,
} from '@/lib/fiche/ficheCatalogVisibilityFilter'

/**
 * Classe la clé document gpu-site / `proceduresByDocument` (ex. `95197_PLU_20200121`,
 * `MEC_1_DU_…`) pour appliquer la visibilité catalogue (AND sur les familles retournées).
 */
export function ficheProcedureCatalogFamiliesForDocumentKey(
  documentKey: string,
  documentType?: string | null,
): FicheDocumentFamily[] {
  const key = documentKey.trim()
  if (!key) return ['du']

  const dt = (documentType ?? '').trim().toUpperCase()

  if (/^MEC_/i.test(key)) {
    const stripped = key.replace(/^MEC(_\d+)?_/i, '')
    return uniqueFamilies(['mec', ...plainDocumentKeyFamilies(stripped, dt)])
  }

  return uniqueDocumentKeyFamilies(key, documentType)
}

/** Toutes les familles déduites de la clé document sont visibles au catalogue. */
export function isFicheProcedureVisibleForDocumentKey(
  documentKey: string,
  documentType?: string | null,
): boolean {
  const families = ficheProcedureCatalogFamiliesForDocumentKey(documentKey, documentType)
  return families.every((f) => isFicheDocumentFamilyVisible(f))
}

/** Tuiles MEC territoire : carte parente DU ou SCoT + couche MEC. */
export function isFicheMecTerritoryPartitionCatalogVisible(
  mapKind: 'mecsDu' | 'mecsScot',
): boolean {
  if (mapKind === 'mecsDu') {
    return isFicheDocumentFamilyVisible('du') && isFicheDocumentFamilyVisible('mec')
  }
  return isFicheDocumentFamilyVisible('scot') && isFicheDocumentFamilyVisible('mec')
}

/** Expose pour tests : logique sans préfixe MEC_. */
export function uniqueDocumentKeyFamilies(
  documentKey: string,
  documentType?: string | null,
): FicheDocumentFamily[] {
  return uniqueFamilies(
    plainDocumentKeyFamilies(documentKey.trim(), (documentType ?? '').trim().toUpperCase()),
  )
}

function uniqueFamilies(families: FicheDocumentFamily[]): FicheDocumentFamily[] {
  return [...new Set(families)]
}

function plainDocumentKeyFamilies(
  documentKey: string,
  documentTypeUpper: string,
): FicheDocumentFamily[] {
  if (documentTypeUpper.includes('SCOT')) return ['scot']
  if (documentTypeUpper.includes('PSMV')) return ['psmv']
  if (documentTypeUpper.includes('SUP')) return ['sup']

  const key = documentKey.trim()
  const upper = key.toUpperCase()

  /**
   * Noms gpu-site : `INSEE_SCOT_YYYYMMDD` mais aussi variantes comme `INSEE_SCoT_R_…`
   * (révision / référence) → segment `_SCOT` sans underscore après le T.
   */
  if (/_SCOT/i.test(key) || /\bSCOT\b/.test(upper)) return ['scot']
  if (/_PSMV/i.test(key) || /\bPSMV\b/.test(upper)) return ['psmv']
  /** Patterns SUP document (gpu-site) — tests séparés pour ancrages explicites (CodeQL js/regex/missing-regexp-anchor). */
  if (
    /^SUP_/i.test(key) ||
    /^\d+_SUP_/i.test(key) ||
    /_\d+_SUP_/i.test(key) ||
    /_SUP_/i.test(key)
  ) {
    return ['sup']
  }

  return ['du']
}

/**
 * Champs de la réponse fiche-info gpu-site lus par la fiche (démo « Fiche info »),
 * pour griser les autres dans la vue des données brutes.
 *
 * Motifs de chemins : `*` = un segment quelconque (partition, identifiant, index) ; `**` en fin = tout le
 * sous-arbre (géométries). Liste contrôlée par un test sur des réponses réelles (`ficheUsedFields.spec.ts`) :
 * une lecture nouvelle par la fiche fait échouer le test tant qu’elle n’est pas déclarée ici.
 */

/** Objets dont les clés sont des données (partitions, identifiants de documents) et non des champs. */
export const FICHE_PAYLOAD_DYNAMIC_PARENTS: ReadonlySet<string> = new Set([
  'dus',
  'psmvs',
  'sups',
  'scots',
  'mecsDu',
  'mecsScot',
  'proceduresByDocument',
  'lowScaleDocument',
])

const DOCUMENT_FIELDS = [
  'id',
  'title',
  'name',
  'originalName',
  'type',
  'status',
  'typeref',
  'viewUrl',
  'legalStatus',
  'effectiveStatus',
  'typeproc_title',
  'typepsc',
]

const documentFields = (prefix: string): string[] => DOCUMENT_FIELDS.map((f) => `${prefix}.${f}`)

const PARCEL_FIELDS = [
  'id',
  'idu',
  'numero',
  'section',
  'code_dep',
  'code_com',
  'com_abs',
  'code_insee',
  'nom_com',
  'code_arr',
  'feuille',
  'num_feuf',
  'contenance',
].map((f) => `parcel.${f}`)

const PROCEDURE_FIELDS = [
  'id',
  'name',
  'documentName',
  'documentType',
  'inProgress',
  'approbationDate',
  'procedureType.title',
  'files.*.url',
  'files.*.uploadedAt',
  'files.*.uploadDate',
].map((f) => `proceduresByDocument.*.*.${f}`)

/** Propriétés des couches carte de la parcelle (règles d’urbanisme, documents, SCoT hors base). */
const PARCEL_FEATURE_PROPERTIES = [
  'libelle',
  'libelong',
  'typezone',
  'typesect',
  'stypesect',
  'typepsc',
  'stypepsc',
  'typeinf',
  'stypeinf',
  'suptype',
  'nomsuplitt',
  'partition',
  'title',
  'approved',
  'gpu_id',
  'gpuId',
  'documentId',
  'id',
  'name',
  'originalName',
  'effectiveStatus',
  'legalStatus',
  'status',
  'urlfic',
  'nomfic',
  'fichier',
  'viewUrl',
  'inDatabase',
  'in_database',
].map((f) => `parcelFiche.features.*.properties.${f}`)

const COMMON = [
  'grid.name',
  'grid.insee',
  'grid.is_rnu',
  'deletedGrids.*.properties.name',
  'typeref',
  'parcelId',
  'territoryParcelId',
  ...PARCEL_FIELDS,
  ...['dus', 'psmvs', 'sups', 'scots'].flatMap((panel) => documentFields(`${panel}.*.documents.*`)),
  ...['mecsDu', 'mecsScot'].flatMap((panel) => documentFields(`${panel}.*.documents.*`)),
  ...documentFields('lowScaleDocument.*'),
  ...PROCEDURE_FIELDS,
  'parcelFiche.features.*.id',
]

export const FICHE_USED_FIELDS: Record<'parcel' | 'territory', readonly string[]> = {
  territory: [
    ...COMMON,
    'gridGeometry.**',
    'grid.feature.geometry.**',
    'parentGridGeometry.**',
    'grid.is_coastline',
    'supIncluded',
    'scotIncluded',
    'scots.*.features.*.partition',
    'scots.*.features.*.name',
    'scots.*.features.*.title',
    'scots.*.features.*.approved',
    'scots.*.features.*.gpu_id',
    'parcelFiche.features.*.properties.partition',
    'parcelFiche.features.*.properties.name',
    'parcelFiche.features.*.properties.title',
    'parcelFiche.features.*.properties.approved',
    'parcelFiche.features.*.properties.gpu_id',
  ],
  parcel: [
    ...COMMON,
    'is_el9_alert',
    'parcelGeometry.**',
    'parcelFeature.geometry.**',
    ...PARCEL_FEATURE_PROPERTIES,
    // Mode Coordonnées (même fiche, règles au point) : mêmes champs dans `pointFiche`.
    'pointFiche.features.*.id',
    ...PARCEL_FEATURE_PROPERTIES.map((path) => path.replace(/^parcelFiche\./, 'pointFiche.')),
  ],
}

export type FicheFieldUsage = 'used' | 'partial' | 'unused'

function segmentMatches(pattern: string, segment: string): boolean {
  return pattern === '*' || pattern === segment
}

/**
 * `used` : champ lu par la fiche (ou dans un sous-arbre `**`) ; `partial` : conteneur dont une partie est lue ;
 * `unused` : rien n’est lu.
 */
export function ficheFieldUsage(
  path: readonly string[],
  patterns: readonly string[],
): FicheFieldUsage {
  let partial = false
  for (const pattern of patterns) {
    const parts = pattern.split('.')
    const subtree = parts[parts.length - 1] === '**'
    const fixed = subtree ? parts.slice(0, -1) : parts
    const common = Math.min(fixed.length, path.length)
    let matches = true
    for (let i = 0; i < common; i += 1) {
      if (!segmentMatches(fixed[i], path[i])) {
        matches = false
        break
      }
    }
    if (!matches) continue
    if (path.length === fixed.length || (subtree && path.length > fixed.length)) return 'used'
    if (path.length < fixed.length) partial = true
  }
  return partial ? 'partial' : 'unused'
}

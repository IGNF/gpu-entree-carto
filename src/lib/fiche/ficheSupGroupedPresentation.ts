import { escapeHtml } from '@/lib/fiche/ficheInfoHtml'
import { documentSupTileHtml, documentTileHrefFromApiFields } from '@/lib/fiche/ficheDocumentTiles'
import { resolveGpuSiteNavigationUrl } from '@/lib/fiche/ficheGpuSiteUrls'
import { readSupCategories, type SupCategory } from '@/lib/fiche/parcelLegendImage'

type GpuFicheDocument = {
  id?: string
  title?: string
  name?: string
  originalName?: string
  type?: string
  status?: string
  viewUrl?: string
  archiveUrl?: string
  typepsc?: string
}

type GpuFichePartition = {
  documents?: GpuFicheDocument[]
}

export type BuildGroupedSupTabOptions = {
  isEl9Alert?: boolean
}

export const EL9_SUP_ALERT_DETAIL =
  "Les propriétés privées riveraines du domaine public maritime (DPM) sont grevées d'une servitude destinée à assurer exclusivement le passage des piétons sur le littoral, sur une bande de trois mètres de largeur à partir de la limite du DPM. Elle s'applique directement sans qu'une mesure règlementaire soit nécessaire pour son instauration."

export function findSupCategoryByName(
  name: string,
  categories: SupCategory[] = readSupCategories(),
): SupCategory | null {
  const key = name.trim().toUpperCase()
  if (!key) return null
  return categories.find((c) => c.name?.trim().toUpperCase() === key) ?? null
}

export function supCategoryForDocument(
  doc: GpuFicheDocument,
  categories: SupCategory[],
): SupCategory | null {
  const typepsc = String(doc.typepsc ?? doc.type ?? '').trim()
  if (typepsc) {
    const hit = categories.find((c) => c.name === typepsc)
    if (hit) return hit
  }
  const title = (doc.title ?? doc.originalName ?? '').toUpperCase()
  return categories.find((c) => c.name && title.includes(String(c.name).toUpperCase())) ?? null
}

function pickProductionDocument(
  documents: GpuFicheDocument[] | undefined,
): GpuFicheDocument | null {
  if (!documents?.length) return null
  const production = documents.filter((d) => d.status === 'document.production')
  return production[0] ?? documents[0] ?? null
}

function supCategoryUrlFiche(category: SupCategory | null): string {
  if (!category) return ''
  const raw = (category.url_fiche ?? category.urlFiche ?? '').trim()
  if (!raw) return ''
  return resolveGpuSiteNavigationUrl(raw)
}

export function supCategoryLibelle(category: SupCategory | null): string {
  return (
    category?.libelle ??
    category?.libelle_court ??
    category?.libelleCourt ??
    category?.name ??
    'Autres servitudes'
  )
}

/** Texte du lien fiche juridique (gpu-client) — nom court de catégorie (ex. AC1, EL9). */
export function supCategoryLegalLinkLabel(
  category: SupCategory | null,
  categoryKey: string,
): string {
  const code =
    category?.name?.trim() || (categoryKey !== '_other' ? categoryKey.trim() : '') || 'SUP'
  return `Lien vers la fiche juridique de la SUP (${code})`
}

function buildSupCategoryGroupHtml(
  category: SupCategory | null,
  categoryKey: string,
  tiles: string[],
): string {
  if (!tiles.length) return ''
  const parts: string[] = []
  const urlFiche = supCategoryUrlFiche(category)
  if (urlFiche) {
    const linkLabel = supCategoryLegalLinkLabel(category, categoryKey)
    parts.push(
      `<p class="ec-fiche-info__sup-legal-link"><a class="fr-link" href="${escapeHtml(urlFiche)}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkLabel)}</a></p>`,
    )
  }
  parts.push(`<div class="ec-fiche-info__tile-list">${tiles.join('')}</div>`)
  return parts.join('')
}

/** Bloc SUP EL9 (alerte littoral) : lien juridique + tuile catégorie EL9. */
export function buildEl9SupGroupHtml(categories: SupCategory[] = readSupCategories()): string {
  const el9Category = findSupCategoryByName('EL9', categories)
  const tile = documentSupTileHtml({
    title: supCategoryLibelle(el9Category),
    detail: EL9_SUP_ALERT_DETAIL,
    href: undefined,
  })
  return buildSupCategoryGroupHtml(el9Category, 'EL9', [tile])
}

/** SUP territoire : groupes par catégorie + lien fiche juridique. */
export function buildGroupedSupTabHtml(
  partitions: Record<string, GpuFichePartition>,
  options?: BuildGroupedSupTabOptions,
): string {
  const categories = readSupCategories()
  const byCategory = new Map<string, { category: SupCategory | null; docs: GpuFicheDocument[] }>()

  for (const partition of Object.values(partitions)) {
    const doc = pickProductionDocument(partition.documents)
    if (!doc) continue
    const cat = supCategoryForDocument(doc, categories)
    const key = cat?.name ?? '_other'
    const bucket = byCategory.get(key) ?? { category: cat, docs: [] }
    bucket.docs.push(doc)
    byCategory.set(key, bucket)
  }

  const parts: string[] = []
  if (options?.isEl9Alert) {
    parts.push(buildEl9SupGroupHtml(categories))
  }

  if (!byCategory.size) {
    return parts.filter(Boolean).join('')
  }

  const sortedKeys = [...byCategory.keys()].sort((a, b) => {
    if (a === '_other') return 1
    if (b === '_other') return -1
    return a.localeCompare(b)
  })

  for (const key of sortedKeys) {
    const bucket = byCategory.get(key)!
    const categoryTitle = supCategoryLibelle(bucket.category)
    const tiles = bucket.docs.map((doc) => {
      const documentTitle = doc.title?.trim() || doc.originalName?.trim() || doc.type || 'Servitude'
      return documentSupTileHtml({
        title: categoryTitle,
        detail: documentTitle,
        href: documentTileHrefFromApiFields(doc),
      })
    })
    parts.push(buildSupCategoryGroupHtml(bucket.category, key, tiles))
  }

  return parts.join('')
}

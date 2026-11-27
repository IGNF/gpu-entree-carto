import { coerceDisplayString } from '@/lib/coerceDisplayString'
import { escapeHtml } from '@/lib/fiche/ficheInfoHtml'
import { resolveGpuSiteNavigationUrl } from '@/lib/fiche/ficheGpuSiteUrls'
import { gpuDocumentFileUrl } from '@/lib/gpuConfigNavigationUrl'

/**
 * URL pièce écrite (PDF) : `urlfic` WFS, sinon `nomfic` absolu, sinon fichier `nomfic` (ou `fichier`
 * pour les SUP) du document (`documentId`) via l’API fichiers de gpu-site ; ancre #page conservée.
 * `''` si indéterminable.
 */
export function resolveParcelRuleWrittenPieceHref(
  properties: Record<string, unknown>,
  documentId?: string,
): string {
  const urlfic = coerceDisplayString(properties.urlfic)
  if (urlfic) return resolveGpuSiteNavigationUrl(urlfic)
  const nomfic = coerceDisplayString(properties.nomfic)
  if (/^https?:\/\//i.test(nomfic)) {
    return resolveGpuSiteNavigationUrl(nomfic)
  }
  const fileName = nomfic || coerceDisplayString(properties.fichier)
  if (!fileName || !documentId) return ''
  return gpuDocumentFileUrl(documentId, fileName) ?? ''
}

const WRITTEN_PIECE_LABEL = 'Ouvrir la pièce écrite (PDF)'

/** Bouton PDF de la règle ; rien sans lien (pas d’icône inactive). */
export function ruleWrittenPieceLinkHtml(href: string): string {
  if (!href) return ''
  const btnClass = 'ec-fiche-info__rule-doc fr-btn fr-btn--tertiary fr-btn--sm'
  const label = escapeHtml(WRITTEN_PIECE_LABEL)
  return `<a class="${btnClass}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${label}"><span class="ri-file-pdf-2-line" aria-hidden="true"></span><span class="fr-sr-only">${label}</span></a>`
}

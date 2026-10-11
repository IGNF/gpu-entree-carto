import { coerceDisplayString } from '@/lib/coerceDisplayString'
import { escapeHtml } from '@/lib/fiche/ficheInfoHtml'
import { resolveGpuSiteNavigationUrl } from '@/lib/fiche/ficheGpuSiteUrls'

/** URL pièce écrite (PDF) : urlfic WFS ou nomfic absolu ; ancre #page conservée. */
export function resolveParcelRuleWrittenPieceHref(properties: Record<string, unknown>): string {
  const urlfic = coerceDisplayString(properties.urlfic)
  if (urlfic) return resolveGpuSiteNavigationUrl(urlfic)
  const nomfic = coerceDisplayString(properties.nomfic)
  if (/^https?:\/\//i.test(nomfic)) {
    return resolveGpuSiteNavigationUrl(nomfic)
  }
  return ''
}

const WRITTEN_PIECE_LABEL = 'Ouvrir la pièce écrite (PDF)'

export function ruleWrittenPieceLinkHtml(href: string): string {
  const btnClass = 'ec-fiche-info__rule-doc fr-btn fr-btn--tertiary fr-btn--sm'
  const label = escapeHtml(WRITTEN_PIECE_LABEL)
  if (href) {
    return `<a class="${btnClass}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${label}"><span class="ri-file-pdf-2-line" aria-hidden="true"></span><span class="fr-sr-only">${label}</span></a>`
  }
  const unavailable = escapeHtml('Pièce écrite indisponible')
  return `<span class="${btnClass} ec-fiche-info__rule-doc--muted" title="${unavailable}" aria-label="${unavailable}" aria-disabled="true"><span class="ri-file-pdf-2-line" aria-hidden="true"></span><span class="fr-sr-only">${unavailable}</span></span>`
}

import config from '@/lib/config'
import { escapeHtml } from '@/lib/fiche/ficheInfoHtml'
import { resolveGpuSiteNavigationUrl } from '@/lib/fiche/ficheGpuSiteUrls'

export const PARCEL_FICHE_INFORMATIVE_NOTICE =
  'NB : Cette fiche a un caractère informatif et ne peut pas être considérée comme un document opposable.'

export const PARCEL_FICHE_PROTECTED_SUP_NOTICE =
  'Certaines SUP dites « protégées » n’apparaissent pas à toutes les échelles sur la carte.'

const PRINT_FICHE_FOOTNOTE_CALLOUT_CLASS = 'fr-callout ec-print-fiche__footnote-callout'

function frCalloutHtml(text: string, options: { print?: boolean } = {}): string {
  const rootClass = options.print ? PRINT_FICHE_FOOTNOTE_CALLOUT_CLASS : 'fr-callout'
  return `<div class="${rootClass}"><p class="fr-callout__text">${text}</p></div>`
}

function readFaqUrlFromConfig(): string | null {
  const candidates: unknown[] = [config.faqUrl]
  if (typeof window !== 'undefined') {
    const gpuConfig = (window as Window & { gpu?: { config?: Record<string, unknown> } }).gpu
      ?.config?.faqUrl
    candidates.push(gpuConfig)
  }
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim()
    if (trimmed.length) return trimmed
  }
  return null
}

export function buildParcelFichePrintFootnotesHtml(): string {
  return [
    frCalloutHtml(escapeHtml(PARCEL_FICHE_INFORMATIVE_NOTICE), { print: true }),
    frCalloutHtml(escapeHtml(PARCEL_FICHE_PROTECTED_SUP_NOTICE), { print: true }),
  ].join('')
}

export function resolveParcelFicheFaqUrl(): string | null {
  const raw = readFaqUrlFromConfig()
  return raw ? resolveGpuSiteNavigationUrl(raw) : null
}

function panelProtectedSupCalloutHtml(): string {
  const faqUrl = resolveParcelFicheFaqUrl()
  let protectedSupText = escapeHtml(PARCEL_FICHE_PROTECTED_SUP_NOTICE)
  protectedSupText += ' Pour plus d’informations, consultez la '
  if (faqUrl) {
    protectedSupText += `<a class="fr-link" href="${escapeHtml(faqUrl)}">FAQ</a>.`
  } else {
    protectedSupText += 'FAQ.'
  }
  return frCalloutHtml(protectedSupText)
}

export function buildParcelFichePanelFootnotesHtml(): string {
  return [
    frCalloutHtml(escapeHtml(PARCEL_FICHE_INFORMATIVE_NOTICE)),
    panelProtectedSupCalloutHtml(),
  ].join('')
}

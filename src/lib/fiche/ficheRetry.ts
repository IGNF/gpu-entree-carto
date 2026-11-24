import type { FicheInfoSelection } from '@/composables/tabPanels'
import type { MapModeId } from '@/lib/map/mapMode'

/** `raw.source` d’une fiche dont la requête fiche-info a échoué (ou service non configuré). */
export const FICHE_UNAVAILABLE_SOURCE = 'fiche-service-unavailable'

const RETRY_ATTR = 'data-ec-fiche-retry'

export type FicheRetryParams = {
  lon: number
  lat: number
  mode: MapModeId
  zoom: number
  loadingTitle?: string
}

const UNAVAILABLE_BODY_HTML = `<p class="ec-fiche-info__unavailable">Indisponibilité du service <button type="button" class="fr-btn fr-btn--tertiary fr-btn--sm" title="Réessayer" aria-label="Réessayer" ${RETRY_ATTR}><i class="ri-refresh-line" aria-hidden="true"></i></button></p>`

/** Requête fiche-info échouée : message + bouton « Réessayer » (paramètres conservés pour la relance). */
export function ficheServiceUnavailableSelection(
  title: string,
  retry: FicheRetryParams,
): FicheInfoSelection {
  return {
    title,
    bodyHtml: UNAVAILABLE_BODY_HTML,
    raw: { source: FICHE_UNAVAILABLE_SOURCE, retry },
  }
}

export function isFicheUnavailableSelection(selection: FicheInfoSelection | null): boolean {
  const raw = selection?.raw
  return Boolean(raw && typeof raw === 'object' && raw.source === FICHE_UNAVAILABLE_SOURCE)
}

export function ficheRetryParamsFromSelection(
  selection: FicheInfoSelection | null,
): FicheRetryParams | null {
  if (!isFicheUnavailableSelection(selection)) return null
  const retry = (selection?.raw as { retry?: FicheRetryParams }).retry
  return retry && Number.isFinite(retry.lon) && Number.isFinite(retry.lat) ? retry : null
}

/** Clic (délégué) sur le bouton « Réessayer » ou son icône. */
export function isFicheRetryClick(event: MouseEvent): boolean {
  const target = event.target
  return target instanceof Element && Boolean(target.closest(`[${RETRY_ATTR}]`))
}

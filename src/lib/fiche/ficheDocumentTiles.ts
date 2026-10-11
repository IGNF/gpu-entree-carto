import { lastApprovedProcedureTileDetail } from '@/lib/fiche/ficheDocumentPresentation'
import { escapeHtml } from '@/lib/fiche/ficheInfoHtml'
import {
  documentIsNonExecutoireEffectiveStatus,
  FICHE_NON_EXECUTOIRE_CALLOUT_HTML,
} from '@/lib/fiche/ficheDocumentPresentation'
import {
  resolveDocumentTileHref,
  resolveGpuProcedureViewUrl,
  resolveGpuSiteNavigationUrl,
} from '@/lib/fiche/ficheGpuSiteUrls'

export type FicheDocumentTileModel = {
  title: string
  href?: string
  effectiveStatus?: string
  legalStatus?: string
  status?: string
  datapproLabel?: string | null
  /** Nature de la dernière procédure approuvée (ex. « Mise à jour n°2 »). */
  procedureNatureLabel?: string | null
  defaultApprovedWhenStatusMissing?: boolean
  /** Texte rouge sous la tuile (MEC sur document DU). */
  mecNoticeHtml?: string
  /** Document issu du WFS sans entrée gpu-site. */
  notInDatabase?: boolean
}

export type FicheProcedureTileModel = {
  title: string
  href?: string
  inProgress?: boolean
  detailLine?: string | null
}

const LEGAL_STATUS_BADGE: Record<string, { className: string; label: string }> = {
  APPROVED: { className: 'ec-fiche-info__badge--approuve', label: 'APPROUVÉ' },
  APPROUVE: { className: 'ec-fiche-info__badge--approuve', label: 'APPROUVÉ' },
  PARTIALLY_CANCELLED: {
    className: 'ec-fiche-info__badge--partiel-annule',
    label: 'PARTIELLEMENT ANNULÉ',
  },
  PARTIELLEMENT_ANNULE: {
    className: 'ec-fiche-info__badge--partiel-annule',
    label: 'PARTIELLEMENT ANNULÉ',
  },
  CANCELLED: { className: 'ec-fiche-info__badge--annule', label: 'ANNULÉ' },
  ANNULE: { className: 'ec-fiche-info__badge--annule', label: 'ANNULÉ' },
  HISTORICAL: { className: 'ec-fiche-info__badge--historique', label: 'HISTORIQUE' },
  HISTORIQUE: { className: 'ec-fiche-info__badge--historique', label: 'HISTORIQUE' },
}

function effectiveBadgeHtml(effectiveStatus?: string): string {
  if (documentIsNonExecutoireEffectiveStatus(effectiveStatus)) {
    return '<span class="ec-fiche-info__badge ec-fiche-info__badge--non-executoire">NON EXÉCUTOIRE</span>'
  }
  return '<span class="ec-fiche-info__badge ec-fiche-info__badge--vigueur">EN VIGUEUR</span>'
}

function legalBadgeHtml(model: FicheDocumentTileModel): string {
  const raw = model.legalStatus?.trim().toUpperCase().replace(/\s+/g, '_')
  if (raw && LEGAL_STATUS_BADGE[raw]) {
    const b = LEGAL_STATUS_BADGE[raw]
    return `<span class="ec-fiche-info__badge ${b.className}">${escapeHtml(b.label)}</span>`
  }
  const approved =
    model.status === 'document.production' ||
    (model.defaultApprovedWhenStatusMissing && !model.status)
  if (approved) {
    return '<span class="ec-fiche-info__badge ec-fiche-info__badge--approuve">APPROUVÉ</span>'
  }
  if (model.status === 'document.preview') {
    return '<span class="ec-fiche-info__badge ec-fiche-info__badge--historique">HISTORIQUE</span>'
  }
  return ''
}

function tileBadgesRow(model: FicheDocumentTileModel, includeEffective: boolean): string {
  const parts: string[] = []
  if (includeEffective) parts.push(effectiveBadgeHtml(model.effectiveStatus))
  const legal = legalBadgeHtml(model)
  if (legal) parts.push(legal)
  if (model.notInDatabase) {
    parts.push(
      '<span class="ec-fiche-info__badge ec-fiche-info__badge--not-in-bdd">NOT IN BDD</span>',
    )
  }
  if (!parts.length) return ''
  return `<div class="ec-fiche-info__tile-badges">${parts.join('')}</div>`
}

function dsfrHorizontalTile(
  title: string,
  href: string | undefined,
  detail: string | null,
): string {
  const titleInner = escapeHtml(title)
  const titleBlock = href
    ? `<h3 class="fr-tile__title"><a class="fr-tile__link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${titleInner}</a></h3>`
    : `<h3 class="fr-tile__title">${titleInner}</h3>`
  const detailBlock = detail ? `<p class="fr-tile__detail">${escapeHtml(detail)}</p>` : ''
  return `<div class="fr-tile fr-tile--horizontal fr-enlarge-link ec-fiche-info__tile"><div class="fr-tile__body"><div class="fr-tile__content">${titleBlock}${detailBlock}</div></div></div>`
}

/** Tuile document DU / PSMV / SCoT (badges effectif + légal). */
export function documentUrbanismTileHtml(model: FicheDocumentTileModel): string {
  const detail = lastApprovedProcedureTileDetail(model.datapproLabel, model.procedureNatureLabel)
  const badges = tileBadgesRow(model, true)
  let core = dsfrHorizontalTile(model.title, model.href, detail)
  if (badges) {
    core = core.replace('<div class="fr-tile__content">', `<div class="fr-tile__content">${badges}`)
  }
  if (model.mecNoticeHtml) {
    core = core.replace(
      '</div></div></div>',
      `<p class="ec-fiche-info__mec-notice">${model.mecNoticeHtml}</p></div></div></div>`,
    )
  }
  return core
}

/** Tuile SUP : titre = catégorie SUP, détail = titre du document (optionnel). */
export function documentSupTileHtml(
  model: Pick<FicheDocumentTileModel, 'title' | 'href'> & { detail?: string | null },
): string {
  const detail = model.detail?.trim() || null
  return dsfrHorizontalTile(model.title, model.href, detail)
}

/** Tuile procédure. */
export function procedureTileHtml(model: FicheProcedureTileModel): string {
  const inProgress = model.inProgress === true
  const statusBadge = inProgress
    ? '<span class="ec-fiche-info__badge ec-fiche-info__badge--procedure">EN COURS DE PROCÉDURE</span>'
    : '<span class="ec-fiche-info__badge ec-fiche-info__badge--vigueur">APPROUVÉE</span>'
  const core = dsfrHorizontalTile(model.title, model.href, model.detailLine ?? null)
  return core.replace(
    '<div class="fr-tile__content">',
    `<div class="fr-tile__content"><div class="ec-fiche-info__tile-badges">${statusBadge}</div>`,
  )
}

export function documentTilesListHtml(tiles: string[]): string {
  if (!tiles.length) return ''
  return `<div class="ec-fiche-info__tile-list">${tiles.join('')}</div>`
}

export { FICHE_NON_EXECUTOIRE_CALLOUT_HTML }

export function documentTileHrefFromApiFields(fields: {
  id?: string
  viewUrl?: string
  archiveUrl?: string
}): string | undefined {
  return resolveDocumentTileHref({
    documentId: fields.id,
    viewUrl: fields.viewUrl,
    archiveUrl: fields.archiveUrl,
  })
}

export function procedureTileHref(procedureId?: string, url?: string): string | undefined {
  const id = procedureId?.trim()
  if (id) return resolveGpuProcedureViewUrl(id)
  const direct = url?.trim()
  if (direct) return resolveGpuSiteNavigationUrl(direct)
  return undefined
}

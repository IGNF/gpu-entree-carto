export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function htmlParagraph(label: string, value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  return `<p><strong>${escapeHtml(label)}</strong> : ${escapeHtml(String(value))}</p>`
}

export const FICHE_LOADING_SPINNER_HTML = `<p class="ec-fiche-info__loading"><span class="ec-fiche-info__spinner fr-icon-refresh-line" aria-hidden="true"></span> Chargement…</p>`

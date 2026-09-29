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

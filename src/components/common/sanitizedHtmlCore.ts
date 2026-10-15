import DOMPurify, { type Config } from 'dompurify'

export const FICHE_LINK_SANITIZE: Config = { ADD_ATTR: ['target'] }

export function sanitizeDisplayHtml(html: string, linkTargetBlank?: boolean): string {
  return DOMPurify.sanitize(html, linkTargetBlank ? FICHE_LINK_SANITIZE : undefined)
}

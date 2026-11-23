import DOMPurify, { type Config } from 'dompurify'

export const FICHE_LINK_SANITIZE: Config = { ADD_ATTR: ['target'] }

/**
 * Instance DOMPurify dédiée : le hook ci-dessous ne doit pas modifier l’instance
 * globale partagée avec geopf-extensions-openlayers.
 */
const purifier = DOMPurify()

/** Tout élément conservant `target` reçoit `rel="noopener noreferrer"` (anti tabnabbing). */
purifier.addHook('afterSanitizeAttributes', (node) => {
  if (!(node instanceof Element) || !node.hasAttribute('target')) return
  const tokens = new Set(
    (node.getAttribute('rel') ?? '')
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t && t !== 'opener'),
  )
  tokens.add('noopener')
  tokens.add('noreferrer')
  node.setAttribute('rel', [...tokens].join(' '))
})

export function sanitizeDisplayHtml(html: string, linkTargetBlank?: boolean): string {
  return purifier.sanitize(html, linkTargetBlank ? FICHE_LINK_SANITIZE : {})
}

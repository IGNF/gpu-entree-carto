import { sanitizeDisplayHtml } from '@/components/common/sanitizedHtmlCore'

/**
 * HTML fiche / tuiles : sans liens ni boutons pièce écrite (aperçu + export).
 * La sortie est assainie (DOMPurify) : sûre même sans repasser par `SanitizedHtml`.
 */
export function sanitizeFicheHtmlForPrint(html: string): string {
  if (!html.trim()) return html
  if (typeof document === 'undefined') return ''

  const tpl = document.createElement('template')
  tpl.innerHTML = sanitizeDisplayHtml(html)

  tpl.content.querySelectorAll('.ec-fiche-info__rule-doc').forEach((el) => el.remove())
  tpl.content.querySelectorAll('hr').forEach((el) => el.remove())

  tpl.content.querySelectorAll('a').forEach((anchor) => {
    const tag = anchor.classList.contains('fr-tile') ? 'div' : 'span'
    const repl = document.createElement(tag)
    repl.className = anchor.className
    repl.innerHTML = anchor.innerHTML
    for (const attr of [...anchor.attributes]) {
      if (attr.name === 'href' || attr.name === 'target' || attr.name === 'rel') continue
      repl.setAttribute(attr.name, attr.value)
    }
    anchor.replaceWith(repl)
  })

  return tpl.innerHTML
}

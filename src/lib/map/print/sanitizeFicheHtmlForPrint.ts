/** HTML fiche / tuiles : sans liens ni boutons pièce écrite (aperçu + export). */
export function sanitizeFicheHtmlForPrint(html: string): string {
  if (!html.trim()) return html
  if (typeof document === 'undefined') return html

  const tpl = document.createElement('template')
  tpl.innerHTML = html

  tpl.content.querySelectorAll('.ec-fiche-info__rule-doc').forEach((el) => el.remove())

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

import { describe, expect, it } from 'vitest'
import { escapeHtml, htmlParagraph } from '@/lib/fiche/ficheInfoHtml'

describe('escapeHtml', () => {
  it('échappe les caractères HTML significatifs', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    )
  })

  it('protège un attribut entre apostrophes', () => {
    const payload = `x' onerror='alert(1)`
    const html = `<img alt='${escapeHtml(payload)}'>`
    const tpl = document.createElement('template')
    tpl.innerHTML = html
    const img = tpl.content.querySelector('img')!
    expect(img.hasAttribute('onerror')).toBe(false)
    expect(img.getAttribute('alt')).toBe(payload)
  })

  it('htmlParagraph échappe libellé et valeur', () => {
    expect(htmlParagraph('<b>', `l'"x"`)).toBe(
      '<p><strong>&lt;b&gt;</strong> : l&#39;&quot;x&quot;</p>',
    )
  })
})

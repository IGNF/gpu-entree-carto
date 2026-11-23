/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { sanitizeFicheHtmlForPrint } from '@/lib/map/print/sanitizeFicheHtmlForPrint'

describe('sanitizeFicheHtmlForPrint', () => {
  it('supprime scripts et gestionnaires d’événements (sortie sûre sans autre passe)', () => {
    const out = sanitizeFicheHtmlForPrint(
      '<p onclick="alert(1)">A</p><script>alert(2)</script><img src="x" onerror="alert(3)"><svg><script>alert(4)</script></svg>',
    )
    expect(out).not.toMatch(/<script/i)
    expect(out).not.toMatch(/\son[a-z]+=/i)
    expect(out).toContain('<p>A</p>')
  })

  it('neutralise les URI javascript: même hors liens', () => {
    const out = sanitizeFicheHtmlForPrint(
      '<form action="javascript:alert(1)"><button formaction="javascript:alert(2)">x</button></form>',
    )
    expect(out).not.toMatch(/javascript:/i)
  })

  it('remplace toujours les liens par des span/div sans href en conservant les classes', () => {
    const out = sanitizeFicheHtmlForPrint(
      '<a class="fr-tile" href="https://example.com" target="_blank"><span>T</span></a><a class="fr-link" href="https://e.com">L</a>',
    )
    expect(out).not.toContain('href=')
    expect(out).not.toContain('target=')
    expect(out).toContain('<div class="fr-tile"><span>T</span></div>')
    expect(out).toContain('<span class="fr-link">L</span>')
  })

  it('retire les boutons pièce écrite et les hr', () => {
    const out = sanitizeFicheHtmlForPrint(
      '<p>A</p><hr><a class="ec-fiche-info__rule-doc" href="x">PDF</a>',
    )
    expect(out).toBe('<p>A</p>')
  })

  it('conserve les vignettes de légende (img) et les attributs aria / data', () => {
    const out = sanitizeFicheHtmlForPrint(
      '<div class="ec-fiche-info__rule-icon" aria-hidden="true" data-x="1"><img class="ec-fiche-info__rule-icon-img" src="https://example.com/l.png" alt=""></div>',
    )
    expect(out).toContain('src="https://example.com/l.png"')
    expect(out).toContain('aria-hidden="true"')
    expect(out).toContain('data-x="1"')
  })
})

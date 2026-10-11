import { describe, expect, it } from 'vitest'
import {
  resolveParcelRuleWrittenPieceHref,
  ruleWrittenPieceLinkHtml,
} from '@/lib/fiche/parcelRuleWrittenPieceLink'

describe('resolveParcelRuleWrittenPieceHref', () => {
  it('conserve l’ancre page du urlfic', () => {
    expect(
      resolveParcelRuleWrittenPieceHref({
        urlfic: 'https://example.com/reg.pdf#page=49',
      }),
    ).toBe('https://example.com/reg.pdf#page=49')
  })

  it('utilise un nomfic absolu si urlfic est absent', () => {
    expect(
      resolveParcelRuleWrittenPieceHref({
        nomfic: 'https://example.com/reg.pdf#page=12',
      }),
    ).toBe('https://example.com/reg.pdf#page=12')
  })
})

describe('ruleWrittenPieceLinkHtml', () => {
  it('lien DSFR bouton tertiaire sm icône PDF seule', () => {
    const html = ruleWrittenPieceLinkHtml('https://example.com/a.pdf#page=1')
    expect(html).toMatch(/<a class="[^"]*fr-btn[^"]*"/)
    expect(html).toContain('fr-btn--tertiary')
    expect(html).toContain('fr-btn--sm')
    expect(html).toContain('aria-label="Ouvrir la pièce écrite (PDF)"')
    expect(html).toContain('fr-sr-only')
    expect(html).toContain('<span class="fr-sr-only">Ouvrir la pièce écrite (PDF)</span>')
    expect(html).toContain('ri-file-pdf-2-line')
    expect(html).toContain('#page=1')
  })
})

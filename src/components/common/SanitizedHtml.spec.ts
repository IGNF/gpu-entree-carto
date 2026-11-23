/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { FICHE_LINK_SANITIZE, sanitizeDisplayHtml } from '@/components/common/sanitizedHtmlCore'

describe('SanitizedHtml linkTargetBlank', () => {
  const linkHtml =
    '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Lien</a>'

  it('expose la config DOMPurify pour conserver target', () => {
    expect(FICHE_LINK_SANITIZE.ADD_ATTR).toContain('target')
  })

  it('retire target="_blank" par défaut (DOMPurify)', () => {
    expect(sanitizeDisplayHtml(linkHtml)).not.toContain('target="_blank"')
  })

  it('conserve target="_blank" avec linkTargetBlank', () => {
    expect(sanitizeDisplayHtml(linkHtml, true)).toContain('target="_blank"')
  })
})

describe('SanitizedHtml : liens target="_blank"', () => {
  it('force rel="noopener noreferrer" quand target="_blank" est conservé', () => {
    const out = sanitizeDisplayHtml('<a href="https://example.com" target="_blank">L</a>', true)
    const a = new DOMParser().parseFromString(out, 'text/html').querySelector('a')!
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')?.split(/\s+/)).toEqual(
      expect.arrayContaining(['noopener', 'noreferrer']),
    )
  })

  it('remplace un rel permissif (opener)', () => {
    const out = sanitizeDisplayHtml(
      '<a href="https://example.com" target="_blank" rel="opener">L</a>',
      true,
    )
    expect(out).not.toMatch(/rel="[^"]*\bopener\b/)
    expect(out).toContain('noopener')
  })

  it('supprime les href javascript:', () => {
    expect(sanitizeDisplayHtml('<a href="javascript:alert(1)">x</a>', true)).not.toMatch(
      /javascript:/i,
    )
  })

  it('ne modifie pas l’instance DOMPurify globale (partagée avec geopf)', async () => {
    const { default: DOMPurify } = await import('dompurify')
    sanitizeDisplayHtml('<a href="https://e.com" target="_blank">L</a>', true)
    const out = DOMPurify.sanitize('<a href="https://e.com" target="_blank">L</a>', {
      ADD_ATTR: ['target'],
    })
    expect(out).not.toContain('noopener')
  })
})

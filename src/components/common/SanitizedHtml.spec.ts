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

import { describe, expect, it } from 'vitest'
import {
  PRINT_TEMPLATE_LAYOUTS,
  findMatchingPrintTemplate,
  measureContextForTemplate,
  templateMatchesFormState,
} from '@/lib/map/print/printTemplates'

describe('printTemplates', () => {
  it('A4 aperçu correspond au gabarit par défaut', () => {
    const template = PRINT_TEMPLATE_LAYOUTS.find((t) => t.id === 'a4-apercu')
    expect(template).toBeDefined()
    const form = {
      paperFormat: 'A4' as const,
      pageOrientation: 'portrait' as const,
      margin: 10,
      dpi: 96,
      format: 'PNG' as const,
    }
    expect(templateMatchesFormState(template!, form)).toBe(true)
    expect(findMatchingPrintTemplate(form)?.id).toBe('a4-apercu')
  })

  it('measureContextForTemplate calcule une zone utile positive', () => {
    const template = PRINT_TEMPLATE_LAYOUTS.find((t) => t.id === 'a4-apercu')!
    const ctx = measureContextForTemplate(template)
    expect(ctx.inner.innerWidthPx).toBeGreaterThan(100)
    expect(ctx.inner.innerHeightPx).toBeGreaterThan(100)
    expect(ctx.cssVars['--print-body-font']).toBeTruthy()
  })
})

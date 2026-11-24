import { describe, expect, it } from 'vitest'
import {
  BASE_DPI,
  HIGH_DPI_VALUE,
  PAPER_FORMATS_MM,
  dpiSelectOptions,
  paperFormatSelectOptions,
  resolveDpiForPaperFormat,
} from '@/lib/map/print/paperFormats'

describe('paperFormatSelectOptions', () => {
  it('tous les formats sont sélectionnables, quel que soit le DPI', () => {
    const options = paperFormatSelectOptions()
    expect(options.map((o) => o.value)).toEqual(Object.keys(PAPER_FORMATS_MM))
    expect(options.every((o) => !('disabled' in o) || !o.disabled)).toBe(true)
  })
})

describe('dpiSelectOptions', () => {
  it('A4 : 300 DPI disponible', () => {
    expect(dpiSelectOptions('A4').find((o) => o.value === HIGH_DPI_VALUE)?.disabled).toBe(false)
  })

  it('A3 et plus : 300 DPI indisponible, avec la raison dans le libellé', () => {
    for (const format of ['A3', 'A2', 'A1', 'A0'] as const) {
      const high = dpiSelectOptions(format).find((o) => o.value === HIGH_DPI_VALUE)
      expect(high?.disabled).toBe(true)
      expect(high?.text).toMatch(/B4/)
    }
  })
})

describe('resolveDpiForPaperFormat', () => {
  it('garde 300 DPI quand le format le permet', () => {
    expect(resolveDpiForPaperFormat(HIGH_DPI_VALUE, 'A4')).toBe(HIGH_DPI_VALUE)
    expect(resolveDpiForPaperFormat(HIGH_DPI_VALUE, 'B4')).toBe(HIGH_DPI_VALUE)
  })

  it('grand format à 300 DPI : repasse en 96 DPI (le format choisi est conservé)', () => {
    expect(resolveDpiForPaperFormat(HIGH_DPI_VALUE, 'A0')).toBe(BASE_DPI)
  })

  it('96 DPI inchangé', () => {
    expect(resolveDpiForPaperFormat(BASE_DPI, 'A0')).toBe(BASE_DPI)
  })
})

import { describe, expect, it } from 'vitest'
import { computeScaleCoeff } from '@/lib/map/print/printScale'

describe('computeScaleCoeff', () => {
  it('ajuste par la largeur quand le contenu est plus large', () => {
    expect(computeScaleCoeff(200, 100, 400, 100)).toBe(0.5)
  })

  it('ajuste par la hauteur quand le contenu est plus haut', () => {
    expect(computeScaleCoeff(100, 200, 100, 400)).toBe(0.5)
  })
})

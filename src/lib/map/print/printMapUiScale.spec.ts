import { describe, expect, it } from 'vitest'
import {
  PRINT_ATTRIBUTION_LOGO_HEIGHT_MM_A4,
  printAttributionLogoHeightMm,
  printMapUiScale,
} from '@/lib/map/print/printMapUiScale'

describe('taille attributions / échelle de la carte imprimée', () => {
  it('A4 : moitié du logo actuel (≈ 19,3 mm → ≈ 9,65 mm)', () => {
    expect(PRINT_ATTRIBUTION_LOGO_HEIGHT_MM_A4).toBeCloseTo(9.65, 2)
    expect(printAttributionLogoHeightMm({ widthMm: 210, heightMm: 297 })).toBeCloseTo(9.65, 2)
  })

  it('proportionnel au plus petit côté du papier, quelle que soit l’orientation', () => {
    expect(printAttributionLogoHeightMm({ widthMm: 297, heightMm: 420 })).toBeCloseTo(
      (9.65 * 297) / 210,
      2,
    )
    expect(printAttributionLogoHeightMm({ widthMm: 297, heightMm: 210 })).toBeCloseTo(9.65, 2)
  })

  it('facteur d’aperçu : logo (34 px de référence) à la taille papier voulue', () => {
    // Aperçu à 2 px par mm : logo A4 de 9,65 mm → 19,3 px, soit 19,3 / 34.
    expect(printMapUiScale({ widthMm: 210, heightMm: 297 }, 2)).toBeCloseTo(19.3 / 34, 3)
  })
})

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

describe('drawScale', () => {
  it('texte et traits à l’échelle aperçu → export, comme les logos (WYSIWYG)', async () => {
    const { captureScaleLineSnapshot, drawScale } = await import('@/lib/map/print/printScale')
    const mapRef = document.createElement('div')
    mapRef.innerHTML =
      '<div class="ol-scale-line"><div style="font-size: 10px; border-bottom-width: 1px">100 m</div></div>'
    const rect = (top: number, height: number) => () =>
      ({
        top,
        bottom: top + height,
        left: 0,
        right: 100,
        width: 100,
        height,
        x: 0,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect
    mapRef.getBoundingClientRect = rect(0, 250)
    ;(mapRef.querySelector('.ol-scale-line') as HTMLElement).getBoundingClientRect = rect(200, 20)
    ;(mapRef.querySelector('.ol-scale-line > div') as HTMLElement).getBoundingClientRect = rect(
      202,
      16,
    )
    const fonts: string[] = []
    const ctx = {
      beginPath: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      set font(v: string) {
        fonts.push(v)
      },
    } as unknown as CanvasRenderingContext2D
    // Carte d’aperçu de 250 px de haut exportée sur 1000 px : facteur 4.
    drawScale(ctx, mapRef, 400, 1000, captureScaleLineSnapshot(mapRef))
    expect(fonts.at(-1)).toContain(' 40px ')
  })
})

describe('captureScaleLineSnapshot', () => {
  it('impression en couleurs claires, même si l’écran est en thème sombre', async () => {
    const { captureScaleLineSnapshot } = await import('@/lib/map/print/printScale')
    const mapRef = document.createElement('div')
    mapRef.innerHTML =
      '<div class="ol-scale-line" style="background-color: rgb(22, 22, 22)"><div style="color: rgb(106, 106, 244)">100 m</div></div>'
    document.body.appendChild(mapRef)
    mapRef.getBoundingClientRect = () => ({ width: 100, height: 100, left: 0, top: 0 }) as DOMRect
    const snapshot = captureScaleLineSnapshot(mapRef)
    expect(snapshot?.outer.backgroundColor).toBe('rgba(255, 255, 255, 0.75)')
    expect(snapshot?.inner.color).toBe('#333333')
    mapRef.remove()
  })
})

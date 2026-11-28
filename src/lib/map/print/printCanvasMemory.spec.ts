import { describe, expect, it } from 'vitest'
import {
  PRINT_CANVAS_TOO_LARGE_MESSAGE,
  assertCanvasUsable,
  releaseCanvas,
} from '@/lib/map/print/printCanvasMemory'

function fakeCanvas(drawWorks: boolean, ctxAvailable = true) {
  const ctx = {
    fillStyle: '',
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [drawWorks ? 255 : 0, 0, 0, 255] }),
  }
  return {
    width: 2480,
    height: 3508,
    getContext: () => (ctxAvailable ? ctx : null),
    remove: () => {},
  } as unknown as HTMLCanvasElement
}

describe('assertCanvasUsable', () => {
  it('toile qui dessine : contexte renvoyé', () => {
    expect(assertCanvasUsable(fakeCanvas(true))).toBeTruthy()
  })

  it('toile au-delà des limites de l’appareil (iOS : ne dessine rien) : erreur explicite', () => {
    expect(() => assertCanvasUsable(fakeCanvas(false))).toThrow(PRINT_CANVAS_TOO_LARGE_MESSAGE)
    expect(() => assertCanvasUsable(fakeCanvas(true, false))).toThrow(
      PRINT_CANVAS_TOO_LARGE_MESSAGE,
    )
  })
})

describe('releaseCanvas', () => {
  it('remet la taille à 0 (mémoire rendue sur iOS)', () => {
    const canvas = fakeCanvas(true)
    releaseCanvas(canvas)
    expect([canvas.width, canvas.height]).toEqual([0, 0])
  })
})

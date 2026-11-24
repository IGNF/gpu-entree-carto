/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { mergeMapLayerCanvases } from '@/lib/map/print/mapExport'

type Call = [string, ...unknown[]]

function fakeCtx(width: number, height: number) {
  const calls: Call[] = []
  const ctx = {
    canvas: { width, height },
    globalAlpha: 1,
    fillStyle: '',
    setTransform: (...a: number[]) => calls.push(['setTransform', ...a]),
    clearRect: () => {},
    fillRect: () => {},
    drawImage: (...a: unknown[]) => calls.push(['drawImage', ...a.slice(1)]),
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

function viewportWithLayer(canvasPx: [number, number], transform: string): HTMLElement {
  const viewport = document.createElement('div')
  const layer = document.createElement('div')
  layer.className = 'ol-layer'
  const canvas = document.createElement('canvas')
  canvas.width = canvasPx[0]
  canvas.height = canvasPx[1]
  canvas.style.transform = transform
  layer.appendChild(canvas)
  viewport.appendChild(layer)
  return viewport
}

const layerTransforms = (calls: Call[]) =>
  calls.filter(([name], i) => name === 'setTransform' && calls[i + 1]?.[0] === 'drawImage')

describe('mergeMapLayerCanvases', () => {
  it('pixelRatio 1 : applique la matrice CSS de la couche telle quelle', () => {
    const { ctx, calls } = fakeCtx(1000, 800)
    mergeMapLayerCanvases(viewportWithLayer([1000, 800], 'matrix(1, 0, 0, 1, 0, 0)'), ctx)
    expect(layerTransforms(calls)).toEqual([['setTransform', 1, 0, 0, 1, 0, 0]])
  })

  it('pixelRatio 2 : la couche (canvas 2× en px, matrice 0,5) remplit tout l’export', () => {
    const { ctx, calls } = fakeCtx(2000, 1600)
    mergeMapLayerCanvases(viewportWithLayer([2000, 1600], 'matrix(0.5, 0, 0, 0.5, 0, 0)'), ctx, 2)
    expect(layerTransforms(calls)).toEqual([['setTransform', 1, 0, 0, 1, 0, 0]])
  })

  it('pixelRatio 2 : la translation CSS est aussi mise à l’échelle', () => {
    const { ctx, calls } = fakeCtx(2000, 1600)
    mergeMapLayerCanvases(viewportWithLayer([2000, 1600], 'matrix(0.5, 0, 0, 0.5, 10, -4)'), ctx, 2)
    expect(layerTransforms(calls)).toEqual([['setTransform', 1, 0, 0, 1, 20, -8]])
  })
})

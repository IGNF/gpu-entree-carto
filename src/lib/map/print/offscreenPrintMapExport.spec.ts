/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import OlMap from 'ol/Map'
import View from 'ol/View'
import { stubResizeObserver } from '@/test/olJsdom'

const waitSpy = vi.fn(
  (_map: unknown, opts?: { signal?: AbortSignal }) =>
    new Promise<{ timedOut: boolean }>((resolve, reject) => {
      const t = setTimeout(() => resolve({ timedOut: false }), 20)
      opts?.signal?.addEventListener('abort', () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    }),
)
vi.mock('@/lib/map/print/waitForMapExportReady', () => ({ waitForMapExportReady: waitSpy }))
vi.mock('@/lib/map/print/mapExport', () => ({ mergeMapLayerCanvases: vi.fn() }))
vi.mock('@/lib/map/print/cloneMapLayers', () => ({ rebuildPrintPreviewMap: vi.fn() }))

const { renderOffscreenPrintMapCanvas } = await import('@/lib/map/print/offscreenPrintMapExport')
const { clearPrintMapRenderCache } = await import('@/lib/map/print/printMapRenderCache')

beforeAll(() => {
  stubResizeObserver()
  // jsdom n’implémente pas le canvas 2D : contexte minimal suffisant pour copier / remplir.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        drawImage: () => {},
        fillRect: () => {},
        clearRect: () => {},
        // Toile qui dessine (vérification `assertCanvasUsable`).
        getImageData: () => ({ data: [255, 0, 0, 255] }),
      }) as unknown as CanvasRenderingContext2D,
  )
})

afterEach(() => {
  waitSpy.mockClear()
  clearPrintMapRenderCache()
})

function previewMap(widthPx: number): OlMap {
  const map = new OlMap({ view: new View({ center: [0, 0], resolution: 1 }) })
  map.setSize([widthPx, 800])
  return map
}

describe('renderOffscreenPrintMapCanvas', () => {
  const opts = { widthPx: 2244, heightPx: 3200, extent: [0, 0, 561, 800], cacheKey: 'k1' }

  it('deux demandes simultanées (préchauffage + export) : un seul rendu', async () => {
    const map = previewMap(561)
    const [a, b] = await Promise.all([
      renderOffscreenPrintMapCanvas(map, opts),
      renderOffscreenPrintMapCanvas(map, opts),
    ])
    expect(waitSpy).toHaveBeenCalledTimes(1)
    expect(a).not.toBe(b)
    expect([a.width, a.height]).toEqual([2244, 3200])
  })

  it('rendu suivant : servi par le cache', async () => {
    const map = previewMap(561)
    await renderOffscreenPrintMapCanvas(map, opts)
    await renderOffscreenPrintMapCanvas(map, opts)
    expect(waitSpy).toHaveBeenCalledTimes(1)
  })

  it('carte d’export rendue avec un pixelRatio, à la taille CSS export ÷ pixelRatio', async () => {
    const preview = previewMap(561)
    const sizes: { map: OlMap; size: unknown }[] = []
    const orig = OlMap.prototype.setSize
    const spy = vi.spyOn(OlMap.prototype, 'setSize').mockImplementation(function (this: OlMap, s) {
      sizes.push({ map: this, size: s })
      return orig.call(this, s)
    })
    await renderOffscreenPrintMapCanvas(preview, { ...opts, cacheKey: undefined })
    spy.mockRestore()
    const exportCalls = sizes.filter((c) => c.map !== preview)
    expect(exportCalls[0].map.getPixelRatio()).toBeCloseTo(2, 5)
    expect(exportCalls.map((c) => c.size)).toContainEqual([1122, 1600])
  })

  it('préchauffage interrompu : rejette, détruit sa carte, ne met rien en cache', async () => {
    const dispose = vi.spyOn(OlMap.prototype, 'dispose')
    const ctrl = new AbortController()
    const p = renderOffscreenPrintMapCanvas(previewMap(561), { ...opts, signal: ctrl.signal })
    await new Promise((r) => setTimeout(r, 5))
    ctrl.abort()
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
    expect(dispose).toHaveBeenCalled()
    dispose.mockRestore()
    // l’export suivant refait un rendu complet (rien en cache, rien « en cours »)
    await renderOffscreenPrintMapCanvas(previewMap(561), opts)
    expect(waitSpy).toHaveBeenCalledTimes(2)
  })

  it('préchauffage interrompu sans autre demande en attente : aucune promesse rejetée non gérée', async () => {
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason)
    }
    process.on('unhandledRejection', onUnhandled)
    const ctrl = new AbortController()
    const p = renderOffscreenPrintMapCanvas(previewMap(561), { ...opts, signal: ctrl.signal })
    await new Promise((r) => setTimeout(r, 5))
    ctrl.abort()
    await p.catch(() => {})
    await new Promise((r) => setTimeout(r, 20))
    process.off('unhandledRejection', onUnhandled)
    expect(unhandled).toEqual([])
  })
})

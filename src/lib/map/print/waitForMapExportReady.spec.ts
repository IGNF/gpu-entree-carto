import { afterEach, describe, expect, it, vi } from 'vitest'
import Observable from 'ol/Observable'
import type OlMap from 'ol/Map'
import { waitForMapExportReady } from '@/lib/map/print/waitForMapExportReady'

/** Carte dont le rendu ne se termine jamais (tuiles en cours). */
class PendingMap extends Observable {
  renders = 0
  getLayers() {
    return { getArray: () => [] }
  }
  renderSync(): void {
    this.renders += 1
  }
}

describe('waitForMapExportReady — interruption', () => {
  afterEach(() => vi.useRealTimers())

  it('rejette avec AbortError dès que le signal est interrompu', async () => {
    const map = new PendingMap()
    const ctrl = new AbortController()
    const p = waitForMapExportReady(map as unknown as OlMap, { signal: ctrl.signal })
    ctrl.abort()
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
    expect(map.hasListener('rendercomplete')).toBe(false)
  })

  it('signal déjà interrompu : rejette sans lancer de rendu', async () => {
    const map = new PendingMap()
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(
      waitForMapExportReady(map as unknown as OlMap, { signal: ctrl.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(map.renders).toBe(0)
  })

  it('n’attend plus le délai max après interruption', async () => {
    vi.useFakeTimers()
    const map = new PendingMap()
    const ctrl = new AbortController()
    const p = waitForMapExportReady(map as unknown as OlMap, {
      signal: ctrl.signal,
      timeoutMs: 120_000,
    }).catch((e: Error) => e.name)
    ctrl.abort()
    expect(await p).toBe('AbortError')
  })
})

describe('waitForMapExportReady — délai dépassé', () => {
  afterEach(() => vi.useRealTimers())

  it('resolveOnTimeout : continue avec les tuiles déjà chargées (export lent sur mobile)', async () => {
    vi.useFakeTimers()
    const p = waitForMapExportReady(new PendingMap() as unknown as OlMap, {
      timeoutMs: 1000,
      resolveOnTimeout: true,
    })
    vi.advanceTimersByTime(1000)
    await expect(p).resolves.toEqual({ timedOut: true })
  })

  it('sans option : rejette comme avant', async () => {
    vi.useFakeTimers()
    const p = waitForMapExportReady(new PendingMap() as unknown as OlMap, { timeoutMs: 1000 })
    vi.advanceTimersByTime(1000)
    await expect(p).rejects.toThrow('Délai dépassé')
  })
})

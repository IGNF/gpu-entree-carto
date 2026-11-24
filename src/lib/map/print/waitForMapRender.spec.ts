import { afterEach, describe, expect, it, vi } from 'vitest'
import Observable from 'ol/Observable'
import type OlMap from 'ol/Map'
import { waitForMapRender } from '@/lib/map/print/waitForMapRender'

/**
 * Carte au repos (tuiles déjà chargées) : comme OL, n’émet `rendercomplete` qu’après
 * une demande de rendu (`render` / `renderSync`), jamais spontanément.
 */
class IdleMap extends Observable {
  renders = 0
  attached = true
  getTargetElement(): HTMLElement | null {
    return this.attached ? ({} as HTMLElement) : null
  }
  private frame(): void {
    this.renders += 1
    queueMicrotask(() => this.dispatchEvent('rendercomplete'))
  }
  render(): void {
    this.frame()
  }
  renderSync(): void {
    this.frame()
  }
}

describe('waitForMapRender', () => {
  afterEach(() => vi.useRealTimers())

  it('carte au repos : 2 passes terminées sans attendre le délai max', async () => {
    vi.useFakeTimers()
    const map = new IdleMap()
    let resolved = false
    void waitForMapRender(map as unknown as OlMap, 2, 10_000).then(() => (resolved = true))
    // aucune avance d’horloge : seules les microtâches tournent
    for (let i = 0; i < 10; i += 1) await Promise.resolve()
    expect(resolved).toBe(true)
    expect(map.renders).toBe(2)
  })

  it('une passe : un seul rendu', async () => {
    const map = new IdleMap()
    await waitForMapRender(map as unknown as OlMap, 1)
    expect(map.renders).toBe(1)
  })

  it('carte qui ne finit jamais son rendu : résout au délai max', async () => {
    vi.useFakeTimers()
    const map = new IdleMap()
    map.render = () => {}
    map.renderSync = () => {}
    let resolved = false
    void waitForMapRender(map as unknown as OlMap, 2, 10_000).then(() => (resolved = true))
    await vi.advanceTimersByTimeAsync(9_999)
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(resolved).toBe(true)
  })

  it('retire son écouteur rendercomplete une fois terminé', async () => {
    const map = new IdleMap()
    await waitForMapRender(map as unknown as OlMap, 2)
    expect(map.hasListener('rendercomplete')).toBe(false)
  })

  it('carte détachée (modale fermée) : résout tout de suite, sans renderSync', async () => {
    const map = new IdleMap()
    map.attached = false
    map.renderSync = () => {
      throw new TypeError("Cannot read properties of null (reading 'renderFrame')")
    }
    await expect(waitForMapRender(map as unknown as OlMap, 2)).resolves.toBeUndefined()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrintPrewarmScheduler } from '@/lib/map/print/printPrewarmScheduler'

describe('PrintPrewarmScheduler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('ne lance la tâche qu’après le délai d’inactivité', async () => {
    const task = vi.fn(async () => {})
    const s = new PrintPrewarmScheduler(3000)
    s.schedule(task)
    await vi.advanceTimersByTimeAsync(2999)
    expect(task).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('chaque nouvelle demande repousse le délai (pas de rafale pendant l’interaction)', async () => {
    const task = vi.fn(async () => {})
    const s = new PrintPrewarmScheduler(3000)
    for (let i = 0; i < 5; i += 1) {
      s.schedule(task)
      await vi.advanceTimersByTimeAsync(1000)
    }
    expect(task).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(3000)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('interrupt() annule une tâche planifiée et interrompt celle en cours', async () => {
    let signal: AbortSignal | undefined
    const s = new PrintPrewarmScheduler(3000)
    s.schedule(async (sig) => {
      signal = sig
      await new Promise(() => {})
    })
    await vi.advanceTimersByTimeAsync(3000)
    expect(signal?.aborted).toBe(false)
    s.interrupt()
    expect(signal?.aborted).toBe(true)

    const later = vi.fn(async () => {})
    s.schedule(later)
    s.interrupt()
    await vi.advanceTimersByTimeAsync(5000)
    expect(later).not.toHaveBeenCalled()
  })

  it('une erreur d’interruption de la tâche n’est pas remontée', async () => {
    const s = new PrintPrewarmScheduler(10)
    s.schedule(() => Promise.reject(new DOMException('Aborted', 'AbortError')))
    await expect(vi.advanceTimersByTimeAsync(10)).resolves.not.toThrow()
  })
})

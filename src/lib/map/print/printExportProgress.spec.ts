import { describe, expect, it } from 'vitest'
import { WeightedExportProgress } from '@/lib/map/print/printExportProgress'

describe('WeightedExportProgress', () => {
  it('avance la progression selon les poids des étapes', () => {
    const updates: Array<{ percent: number; detail: string }> = []
    const progress = new WeightedExportProgress(
      [{ weight: 50 }, { weight: 50 }],
      (percent, detail) => {
        updates.push({ percent, detail })
      },
    )

    progress.startStep(0, 'Carte')
    progress.tick(1)
    progress.endStep()
    progress.startStep(1, 'Fichier')
    progress.tick(1)
    progress.endStep()

    expect(updates.at(-1)?.percent).toBe(100)
    expect(updates.at(-1)?.detail).toBe('Fichier')
  })
})

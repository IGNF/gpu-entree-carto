/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canShareExportFiles, shareExportFiles } from '@/lib/map/print/printDelivery'

const file = new File(['%PDF'], 'carte.pdf', { type: 'application/pdf' })

function setup(opts: { coarse: boolean; canShare?: boolean; share?: () => Promise<void> }) {
  vi.stubGlobal('matchMedia', () => ({ matches: opts.coarse }))
  Object.assign(navigator, {
    canShare: opts.canShare === undefined ? undefined : () => opts.canShare,
    share: opts.share,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  Object.assign(navigator, { canShare: undefined, share: undefined })
})

describe('canShareExportFiles', () => {
  it('téléphone avec partage de fichiers : oui', () => {
    setup({ coarse: true, canShare: true })
    expect(canShareExportFiles([file])).toBe(true)
  })

  it('ordinateur (souris) ou sans partage : non, téléchargement direct', () => {
    setup({ coarse: false, canShare: true })
    expect(canShareExportFiles([file])).toBe(false)
    setup({ coarse: true })
    expect(canShareExportFiles([file])).toBe(false)
  })
})

describe('shareExportFiles', () => {
  it('partage refusé : ouvre le fichier dans un nouvel onglet', async () => {
    const open = vi.fn()
    vi.stubGlobal('open', open)
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x' })
    setup({
      coarse: true,
      canShare: true,
      share: () => Promise.reject(new DOMException('no', 'NotAllowedError')),
    })
    await shareExportFiles([file])
    expect(open).toHaveBeenCalledWith('blob:x', '_blank')
  })

  it('annulé par l’utilisateur : rien d’autre', async () => {
    const open = vi.fn()
    vi.stubGlobal('open', open)
    setup({
      coarse: true,
      canShare: true,
      share: () => Promise.reject(new DOMException('x', 'AbortError')),
    })
    await shareExportFiles([file])
    expect(open).not.toHaveBeenCalled()
  })
})

/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import config from '@/lib/config'
import {
  ENTREE_PRINT_WORKER_ASSET,
  resolveEmbedPrintExportWorkerUrl,
  resolvePrintExportWorkerHrefForScriptBase,
} from '@/lib/map/print/printExportWorkerUrl'

describe('resolvePrintExportWorkerHrefForScriptBase', () => {
  it('résout le worker sous le répertoire du script entree-carto', () => {
    expect(
      resolvePrintExportWorkerHrefForScriptBase(
        'http://localhost:8000/build/vendor/entree-carto/entree-carto.min.js',
      ),
    ).toBe('http://localhost:8000/build/vendor/entree-carto/assets/printExport.worker-embed.js')
    expect(ENTREE_PRINT_WORKER_ASSET).toBe('assets/printExport.worker-embed.js')
  })
})

describe('resolveEmbedPrintExportWorkerUrl', () => {
  const initialScriptDir = config.scriptDir

  // Build de production (en test, import.meta.env.DEV vaut true).
  beforeEach(() => vi.stubEnv('DEV', false))

  afterEach(() => {
    vi.unstubAllEnvs()
    document.head.replaceChildren()
    config.scriptDir = initialScriptDir
  })

  it('embed : worker précompilé à côté du script entree-carto', () => {
    const script = document.createElement('script')
    script.src = 'https://gpu.example/build/vendor/entree-carto/entree-carto.min.js'
    document.head.appendChild(script)
    expect(resolveEmbedPrintExportWorkerUrl()).toBe(
      'https://gpu.example/build/vendor/entree-carto/assets/printExport.worker-embed.js',
    )
  })

  it('hors embed (démo SPA) : null, jamais une URL vers un fichier .ts', () => {
    config.scriptDir = '/'
    const url = resolveEmbedPrintExportWorkerUrl()
    expect(url).toBeNull()
  })

  it('en dev : null (le worker est servi et compilé par Vite)', () => {
    vi.stubEnv('DEV', true)
    const script = document.createElement('script')
    script.src = 'https://gpu.example/entree-carto.js'
    document.head.appendChild(script)
    expect(resolveEmbedPrintExportWorkerUrl()).toBeNull()
  })
})

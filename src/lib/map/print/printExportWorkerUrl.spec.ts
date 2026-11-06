import { describe, expect, it } from 'vitest'
import {
  ENTREE_PRINT_WORKER_ASSET,
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

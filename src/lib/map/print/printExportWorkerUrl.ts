import config from '@/lib/config'

/** Fichier émis par `scripts/build-print-export-worker.mjs` (build lib). */
export const ENTREE_PRINT_WORKER_ASSET = 'assets/printExport.worker-embed.js'

function entreeCartoScriptSrc(): string | null {
  if (typeof document === 'undefined') return null
  const candidates = [
    document.querySelector<HTMLScriptElement>('script[src*="entree-carto.min.js"]'),
    document.querySelector<HTMLScriptElement>('script[src*="entree-carto.js"]'),
  ]
  for (const el of candidates) {
    if (!el?.src) continue
    const src = el.src.split('?')[0]
    if (/entree-carto(\.min)?\.js$/i.test(src.split('/').pop() ?? '')) {
      return src
    }
  }
  return null
}

export function resolvePrintExportWorkerHrefForScriptBase(scriptSrc: string): string {
  return new URL(ENTREE_PRINT_WORKER_ASSET, scriptSrc).href
}

function resolveAgainstEntreeCartoScript(assetPath: string): string | null {
  const scriptSrc = entreeCartoScriptSrc()
  if (scriptSrc) {
    return new URL(assetPath, scriptSrc).href
  }
  const scriptDir = config.scriptDir
  if (typeof scriptDir === 'string' && scriptDir.length > 1 && scriptDir !== '/') {
    const base = scriptDir.endsWith('/') ? scriptDir : `${scriptDir}/`
    return new URL(assetPath, base).href
  }
  return null
}

/**
 * URL du worker d’export : relative au script entree-carto (embed gpu-site),
 * pas à `document.baseURI` (/map/ sur gpu-site).
 */
export function resolvePrintExportWorkerUrl(): string {
  if (import.meta.env?.DEV) {
    return new URL('./printExport.worker.ts', import.meta.url).href
  }

  const resolved = resolveAgainstEntreeCartoScript(ENTREE_PRINT_WORKER_ASSET)
  if (resolved) return resolved

  return new URL('./printExport.worker.ts', import.meta.url).href
}

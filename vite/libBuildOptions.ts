import type { PreRenderedAsset } from 'rollup'
import type { ESBuildOptions } from 'vite'

/** Workers (export PDF) : format ES requis si le worker importe pdf-lib (pas IIFE multi-chunks). */
export const vitePrintWorkerBuildOptions = {
  worker: { format: 'es' as const },
}

/**
 * Option Vite racine `esbuild` (pas `build.esbuild`) : utilisée aussi pour la minification
 * des bundles IIFE `.min.js` — retire console.* (deps geopf / OL inclus) et debugger.
 */
export function libMinifyEsbuildOptions(minify: boolean): ESBuildOptions | false | undefined {
  if (!minify) return undefined
  return { drop: ['console', 'debugger'] }
}

export function libCssAssetFileName(prefix: string, minify: boolean) {
  return (assetInfo: PreRenderedAsset): string => {
    const name = assetInfo.name ?? ''
    if (name.endsWith('.css')) {
      return minify ? `css/${prefix}.min.css` : `css/${prefix}.css`
    }
    if (/remixicon\.(woff2|woff|ttf)$/i.test(name)) {
      return 'css/fonts/[name][extname]'
    }
    return 'assets/[name][extname]'
  }
}

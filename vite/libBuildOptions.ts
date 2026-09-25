import type { PreRenderedAsset } from 'rollup'
import type { EsbuildOptions } from 'esbuild'

/**
 * Option Vite racine `esbuild` (pas `build.esbuild`) : utilisée aussi pour la minification
 * des bundles IIFE `.min.js` — retire console.* (deps geopf / OL inclus) et debugger.
 */
export function libMinifyEsbuildOptions(minify: boolean): EsbuildOptions | false | undefined {
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

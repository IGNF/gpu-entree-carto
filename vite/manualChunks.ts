/**
 * Découpe des vendors pour la démo Vite (cache navigateur, chunks < seuil d’avertissement).
 */
export function demoManualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined

  if (id.includes('geopf-extensions-openlayers')) return 'vendor-geopf'
  if (id.includes('maplibre-gl') || id.includes('@panoramax/')) return 'vendor-maplibre'
  if (id.includes('/ol/') || id.includes('node_modules/ol/')) return 'vendor-openlayers'
  if (
    id.includes('@gouvfr/dsfr') ||
    id.includes('@gouvminint/vue-dsfr') ||
    id.includes('vue-dsfr')
  ) {
    return 'vendor-dsfr'
  }
  if (id.includes('vue') || id.includes('vue-router')) return 'vendor-vue'
  if (id.includes('html2canvas')) return 'vendor-html2canvas'
  if (id.includes('pdf-lib') || id.includes('dompurify')) return 'vendor-print-pdf'
  // Import KML du croquis : fast-xml-parser et ses dépendances (sinon chunk index > 500 kB)
  if (
    /node_modules\/(fast-xml-parser|fast-xml-builder|@nodable\/entities|is-unsafe|path-expression-matcher|xml-naming)\//.test(
      id,
    )
  ) {
    return 'vendor-xml'
  }

  return undefined
}

/** Bundles IIFE monolithiques (lib, geometry-editor, sketch) : OL + UI dans un seul fichier. */
export const MONOLITHIC_IIFE_CHUNK_LIMIT_KB = 3500

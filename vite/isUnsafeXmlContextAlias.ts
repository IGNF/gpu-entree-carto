import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const vendorXmlContext = fileURLToPath(
  new URL('../src/vendor/is-unsafe-xml-context.js', import.meta.url),
)

const upstreamSuffix = `${path.sep}is-unsafe${path.sep}src${path.sep}contexts${path.sep}xml.js`

/**
 * Remplace is-unsafe `contexts/xml.js` au bundle (fast-xml-parser → geometry-editor / sketch).
 * Voir `src/vendor/is-unsafe-xml-context.js`.
 */
export function isUnsafeXmlContextAlias(): Plugin {
  return {
    name: 'entree-carto-is-unsafe-xml-context',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === './contexts/xml.js' && importer?.includes(`${path.sep}is-unsafe${path.sep}`)) {
        return vendorXmlContext
      }
      if (source.endsWith('is-unsafe/src/contexts/xml.js')) {
        return vendorXmlContext
      }
      if (idEndsWithUpstreamXmlContext(source)) {
        return vendorXmlContext
      }
      return null
    },
  }
}

function idEndsWithUpstreamXmlContext(source: string): boolean {
  return source.replace(/\//g, path.sep).endsWith(upstreamSuffix)
}
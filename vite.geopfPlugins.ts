import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

/** geopf-extensions-openlayers Search.js — setUrl utilise eval (avertissement Rollup + risque XSS). */
const GEOPF_SEARCH_SET_URL_EVAL =
  /m_url\s*=\s*eval\s*\(\s*"`"\s*\+\s*value\s*\+\s*"`"\s*\)\s*;\s*\/\/\s*insecure\s*!/

const GEOPF_SEARCH_SET_URL_SAFE =
  'm_url = String(value ?? ""); /* entree-carto: pas d’eval (URL service fixe) */'

function isGeopfSearchModuleId(id: string): boolean {
  return (
    id.includes('geopf-extensions-openlayers') &&
    id.replace(/\\/g, '/').endsWith('/Services/Search.js')
  )
}

/**
 * Remplace l’eval de setUrl par une affectation de chaîne (comportement identique pour nos URLs HTTPS).
 * @see https://github.com/IGNF/geopf-extensions-openlayers
 */
export function patchGeopfSearchEval(): Plugin {
  return {
    name: 'entree-carto-geopf-search-eval-patch',
    enforce: 'pre',
    load(id) {
      if (!isGeopfSearchModuleId(id)) return null
      const code = readFileSync(id, 'utf8')
      if (!GEOPF_SEARCH_SET_URL_EVAL.test(code)) return code
      return code.replace(GEOPF_SEARCH_SET_URL_EVAL, GEOPF_SEARCH_SET_URL_SAFE)
    },
  }
}

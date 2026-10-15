import type { Plugin } from 'vite'

const STUB_ID = '\0entree-carto:dsfr-icons-stub.css'

/**
 * Les bundles lib gpu-site ne doivent pas embarquer icons.min.css (~2 Mo) :
 * le site charge déjà utility / icônes DSFR (audit gpu-site 4.2).
 */
export function stubDsfrIconsCss(): Plugin {
  return {
    name: 'entree-carto-stub-dsfr-icons-css',
    enforce: 'pre',
    resolveId(id) {
      if (id.includes('@gouvfr/dsfr/dist/utility/icons/icons.min.css')) return STUB_ID
      if (id.endsWith('utility/icons/icons.min.css')) return STUB_ID
      return null
    },
    load(id) {
      if (id === STUB_ID) return '/* DSFR icons: fournis par gpu-site ou public/external (démo) */'
      return null
    },
  }
}

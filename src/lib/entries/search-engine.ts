/**
 * Bundle IIFE accueil : SearchEngine geopf (`gpu.mountSearchEngine`) + CSS associé.
 */
import 'ol/ol.css'
import 'geopf-extensions-openlayers/css/Dsfr.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@/styles/map-controls.css'
import '@/styles/search-engine-standalone.css'
import { mountSearchEngine } from '@/lib/mountSearchEngine'

export { mountSearchEngine }
export type { MountSearchEngineOptions, MountedSearchEngine } from '@/lib/mountSearchEngine'

const api = { mountSearchEngine }

if (typeof window !== 'undefined') {
  const w = window as Window & { gpu?: Record<string, unknown> }
  w.gpu = { ...(w.gpu ?? {}), ...api }
}

export default api

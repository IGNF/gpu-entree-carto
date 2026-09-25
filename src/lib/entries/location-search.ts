/**
 * Bundle IIFE léger : widget autocomplete accueil (`gpu.mountLocationSearch`).
 */
import '@/styles/location-search-host.css'
import { mountLocationSearch } from '@/lib/mountLocationSearch'
import Geocode from '@/lib/services/Geocode'
import LocateControl from '@/lib/control/LocateControl'

export { mountLocationSearch }
export type { MountLocationSearchOptions, MountedLocationSearch } from '@/lib/mountLocationSearch'

const api = {
  mountLocationSearch,
  services: { Geocode },
  control: { LocateControl },
}

if (typeof window !== 'undefined') {
  const w = window as Window & { gpu?: Record<string, unknown> }
  w.gpu = { ...(w.gpu ?? {}), ...api }
}

export default api

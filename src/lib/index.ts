import config, { setScriptDirFromCurrentScript } from '@/lib/config'
import { createStandardViewer } from '@/lib/createStandardViewer'
import { ParcelViewer } from '@/lib/ParcelViewer'
import LocateControl from '@/lib/control/LocateControl'
import Geocode from '@/lib/services/Geocode'
import { mountLocationSearch } from '@/lib/mountLocationSearch'
import { mountSearchEngine } from '@/lib/mountSearchEngine'
import packageJson from '../../package.json'

setScriptDirFromCurrentScript()

const gpu = {
  config,
  createStandardViewer,
  ParcelViewer,
  mountSearchEngine,
  mountLocationSearch,
  control: {
    LocateControl,
  },
  services: {
    Geocode,
  },
  informations: {
    name: packageJson.name,
    description: packageJson.description,
    version: packageJson.version,
  },
}

export default gpu

if (typeof window !== 'undefined') {
  const existing = (window as Window & { gpu?: typeof gpu }).gpu
  if (existing?.config) {
    Object.assign(existing.config, config)
  }
  ;(window as Window & { gpu: typeof gpu }).gpu = {
    ...gpu,
    config: existing?.config ?? config,
  }
}

declare global {
  interface Window {
    gpu: typeof gpu
  }
}

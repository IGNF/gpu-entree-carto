import config from '@/lib/config'

export interface IgnGeoportalAttributionOptions {
  yearOfIgnCopyright?: number
  /** Racine des assets (gpu-client `options.imgDir` / `gpu.config.scriptDir`). */
  imgDir?: string
}

function normalizeDir(dir: string): string {
  return dir.replace(/\/$/, '')
}

/** Chemin racine pour `img/logos/*` (public Vite ou répertoire du bundle embed). */
export function ignGeoportalAttributionsImgDir(override?: string): string {
  if (override !== undefined && override !== '') {
    return normalizeDir(override)
  }
  const scriptDir = typeof config.scriptDir === 'string' ? normalizeDir(config.scriptDir) : ''
  if (scriptDir && scriptDir !== '/') {
    return scriptDir
  }
  return normalizeDir(import.meta.env.BASE_URL || '')
}

/**
 * Attributions HTML des couches WMTS Géoplateforme — alignées sur
 * gpu-client `helper.createGeoportalLayer` / `createWMTSSource`.
 */
export function ignGeoportalAttributions(options: IgnGeoportalAttributionOptions = {}): string[] {
  const year =
    options.yearOfIgnCopyright ??
    (typeof config.yearOfIgnCopyright === 'number' ? config.yearOfIgnCopyright : 2019)
  const imgDir = ignGeoportalAttributionsImgDir(options.imgDir)

  return [
    `<a href="http://www.ign.fr/" target="_blank" class="legal-attribution">© IGN – ${year} – copie et reproduction interdite</a>`,
    `<a href="http://www.ign.fr/" target="_blank"><img class="map-logo-ign-svg" src="${imgDir}/img/logos/logo-ign.svg" /></a>`,
    `<a href="http://www.cohesion-territoires.gouv.fr/" target="_blank"><img class="map-logo-ministere-svg" src="${imgDir}/img/logos/logo-ministere.png" /></a>`,
  ]
}

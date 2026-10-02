import config from '@/lib/config'

export interface IgnGeoportalAttributionOptions {
  yearOfIgnCopyright?: number
  /** Racine des assets (gpu-client `options.imgDir` / `gpu.config.scriptDir`). */
  imgDir?: string
}

export const ATTRIBUTION_TITLE_IGN =
  "IGN - Institut National de l'Information Géographique et Forestière"

export const ATTRIBUTION_TITLE_MINISTERE =
  "Ministère de l'Aménagement du territoire - Ministère de la Transition écologique"

export const ATTRIBUTION_TITLE_DGF = '© Direction générale des finances publiques'

function attributionLogoLink(href: string, imgClass: string, src: string, title: string): string {
  const safeTitle = title.replace(/"/g, '&quot;')
  return `<a href="${href}" target="_blank" title="${safeTitle}"><img class="${imgClass}" src="${src}" alt="" title="${safeTitle}" /></a>`
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
    `<a href="http://www.ign.fr/" target="_blank" class="legal-attribution">© IGN – ${year} – copie et<br class="ec-legal-attribution__br" aria-hidden="true"><span class="ec-legal-attribution__line2"> reproduction interdite<i class="fr-icon-external-link-line ec-legal-attribution__ext-icon" aria-hidden="true"></i></span></a>`,
    attributionLogoLink(
      'http://www.ign.fr/',
      'map-logo-ign-svg',
      `${imgDir}/img/logos/logo-ign.svg`,
      ATTRIBUTION_TITLE_IGN,
    ),
    attributionLogoLink(
      'http://www.cohesion-territoires.gouv.fr/',
      'map-logo-ministere-svg',
      `${imgDir}/img/logos/logo-ministere.png`,
      ATTRIBUTION_TITLE_MINISTERE,
    ),
  ]
}

/** Couche cadastre INSPIRE (DGFIP) — gpu-client `CadastreLow.attributionsInspire`. */
export function dgfInspireCadastreAttributions(
  options: Pick<IgnGeoportalAttributionOptions, 'imgDir'> = {},
): string[] {
  const imgDir = ignGeoportalAttributionsImgDir(options.imgDir)
  return [
    attributionLogoLink(
      'https://www.cadastre.gouv.fr',
      'map-logo-marianne-svg',
      `${imgDir}/img/logos/logo-marianne.svg`,
      ATTRIBUTION_TITLE_DGF,
    ),
    attributionLogoLink(
      'http://www.cohesion-territoires.gouv.fr/',
      'map-logo-ministere-svg',
      `${imgDir}/img/logos/logo-ministere.png`,
      ATTRIBUTION_TITLE_MINISTERE,
    ),
  ]
}

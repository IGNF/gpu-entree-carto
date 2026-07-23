/**
 * Configuration partagée avec gpu-site (gpu_client_config.js.twig).
 * Les propriétés sont enrichies par le site via Object.assign(gpu.config, …).
 */
const config: Record<string, unknown> = {
  scriptDir: '/',
  minZoomLevelForParcel: 12,
  yearOfIgnCopyright: 2019,
  showMapHelpAtLoad: false,
  prefix: '',
  envergoUrl:
    'https://envergo.beta.gouv.fr/simulateur/formulaire/?lng=[LONGITUDE]&lat=[LATITUDE]&zoom=[ZOOM]&mtm_campaign=service-gpu',
  apiFicheInfoUrl: '/api/fiche-info',
}

export function setScriptDirFromCurrentScript(): void {
  const candidates: Array<HTMLScriptElement | null | undefined> = [
    document.currentScript instanceof HTMLScriptElement ? document.currentScript : null,
    document.querySelector<HTMLScriptElement>('script[src*="entree-carto"]'),
  ]
  const script = candidates.find((el) => el?.src)
  if (!script?.src) return
  const path = script.src.split('?')[0]
  config.scriptDir = path.split('/').slice(0, -1).join('/')
}

export default config

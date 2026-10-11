import { getGpuClientConfigScriptUrl } from '@/lib/configUrls'

/**
 * En dev Vite, les URLs gpu-site (127.0.0.1:8000) passent par un proxy same-origin
 * pour éviter OpaqueResponseBlocking (légendes, fetch config, etc.).
 */
export const GPU_VITE_DEV_PROXY_PREFIX = '/__gpu_dev_proxy__'

const LOCAL_GPU_SITE = /^https?:\/\/(?:127\.0\.0\.1|localhost):8000(?=\/|$)/i

export function isGpuDevProxyPath(url: string): boolean {
  const t = url.trim()
  return t === GPU_VITE_DEV_PROXY_PREFIX || t.startsWith(`${GPU_VITE_DEV_PROXY_PREFIX}/`)
}

export function isViteDevBrowser(): boolean {
  return typeof import.meta !== 'undefined' && import.meta.env.DEV
}

/** Retire les segments proxy déjà injectés dans une URL gpu-site (réparation après double réécriture). */
function normalizeLocalGpuSiteUrl(url: string): string {
  if (!LOCAL_GPU_SITE.test(url)) return url
  try {
    const u = new URL(url)
    u.pathname = u.pathname.replace(/(?:\/__gpu_dev_proxy__)+/g, '') || '/'
    return u.href
  } catch {
    return url
  }
}

export function rewriteLocalGpuSiteUrl(url: string): string {
  if (!url || !isViteDevBrowser()) return url
  if (isGpuDevProxyPath(url)) return url
  const normalized = normalizeLocalGpuSiteUrl(url)
  if (!LOCAL_GPU_SITE.test(normalized)) return url
  return normalized.replace(LOCAL_GPU_SITE, GPU_VITE_DEV_PROXY_PREFIX)
}

/** Liens HTML / navigation : garder l’hôte gpu-site (pas le proxy fetch). */
const GPU_CONFIG_NAVIGATION_URL_KEYS = new Set([
  'baseUrl',
  'faqUrl',
  'historicUrl',
  'documentViewUrl',
  'procedureViewUrl',
  'metadataDetailsUrl',
  'metadataContactsUrl',
  'parcelInfoUrl',
  'territoryInfoUrl',
  'documentDownloadModalUrl',
  'printLegendUrl',
])

export function isGpuConfigNavigationUrlKey(key: string): boolean {
  return GPU_CONFIG_NAVIGATION_URL_KEYS.has(key)
}

/**
 * Chemins passés par le proxy dev → URL gpu-site absolue pour `<a href>` / nouvel onglet.
 */
export function gpuSiteNavigationUrlFromProxy(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed || typeof window === 'undefined') return trimmed

  let pathname = trimmed
  let search = ''
  let hash = ''

  if (trimmed.includes(GPU_VITE_DEV_PROXY_PREFIX)) {
    try {
      const u = new URL(trimmed, window.location.href)
      pathname = u.pathname.replace(new RegExp(`^${GPU_VITE_DEV_PROXY_PREFIX}`), '') || '/'
      search = u.search
      hash = u.hash
    } catch {
      pathname = trimmed.replace(GPU_VITE_DEV_PROXY_PREFIX, '') || '/'
    }
  } else if (LOCAL_GPU_SITE.test(trimmed)) {
    return trimmed
  }

  const scriptBase =
    getGpuClientConfigScriptUrl() ??
    (typeof document !== 'undefined'
      ? (document.querySelector<HTMLScriptElement>('script#gpu-client-config[src]')?.src ??
        document.querySelector<HTMLScriptElement>('script[data-ec-demo-config][src]')?.src)
      : null)

  if (scriptBase && pathname.startsWith('/')) {
    return new URL(`${pathname}${search}${hash}`, scriptBase).href
  }

  return `${pathname}${search}${hash}`
}

/** Réécrit les URLs gpu-site dans `config` et `window.gpu.config`. */
export function rewriteGpuConfigUrlsForViteDev(target: Record<string, unknown>): void {
  if (!isViteDevBrowser()) return
  for (const key of Object.keys(target)) {
    if (isGpuConfigNavigationUrlKey(key)) continue
    const val = target[key]
    if (typeof val === 'string') {
      target[key] = rewriteLocalGpuSiteUrl(val)
    }
  }
}

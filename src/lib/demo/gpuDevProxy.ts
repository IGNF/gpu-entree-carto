/**
 * En dev Vite, les URLs gpu-site (127.0.0.1:8000) passent par un proxy same-origin
 * pour éviter OpaqueResponseBlocking (légendes, fetch config, etc.).
 */
export const GPU_VITE_DEV_PROXY_PREFIX = '/__gpu_dev_proxy__'

const LOCAL_GPU_SITE = /^https?:\/\/(?:127\.0\.0\.1|localhost):8000(?=\/|$)/i

export function isViteDevBrowser(): boolean {
  return typeof import.meta !== 'undefined' && import.meta.env.DEV
}

export function rewriteLocalGpuSiteUrl(url: string): string {
  if (!url || !isViteDevBrowser()) return url
  if (!LOCAL_GPU_SITE.test(url)) return url
  return url.replace(LOCAL_GPU_SITE, GPU_VITE_DEV_PROXY_PREFIX)
}

/** Réécrit les URLs gpu-site dans `config` et `window.gpu.config`. */
export function rewriteGpuConfigUrlsForViteDev(
  target: Record<string, unknown>,
): void {
  if (!isViteDevBrowser()) return
  for (const key of Object.keys(target)) {
    const val = target[key]
    if (typeof val === 'string') {
      target[key] = rewriteLocalGpuSiteUrl(val)
    }
  }
}

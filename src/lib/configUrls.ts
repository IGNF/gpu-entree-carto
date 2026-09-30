/**
 * Résolution des URL relatives de `gpu.config` par rapport au script
 * gpu-client-config.js (hôte du fichier de config), pas la page SPA.
 */
import { isGpuDevProxyPath, rewriteLocalGpuSiteUrl } from '@/lib/demo/gpuDevProxy'

let gpuClientConfigScriptUrl: string | null = null

export function setGpuClientConfigScriptUrl(url: string | null): void {
  gpuClientConfigScriptUrl = url?.trim() || null
}

export function getGpuClientConfigScriptUrl(): string | null {
  return gpuClientConfigScriptUrl
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('//')
}

/**
 * Résout une URL ou un chemin de config (ex. `/api/fiche-info`) :
 * - absolue → inchangée ;
 * - relative → base = URL du gpu-client-config.js si connue, sinon origine de la page.
 */
export function resolveConfigUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed || isAbsoluteUrl(trimmed)) return trimmed
  if (isGpuDevProxyPath(trimmed)) return trimmed

  if (typeof window === 'undefined') return trimmed

  const baseHref =
    gpuClientConfigScriptUrl ??
    (typeof document !== 'undefined' ? window.location.href : 'http://localhost/')

  return new URL(trimmed, baseHref).href
}

/** URL prête pour `fetch` (résolution + proxy dev Vite si gpu-site local). */
export function resolveConfigUrlForFetch(raw: string): string {
  const trimmed = raw.trim()
  if (isGpuDevProxyPath(trimmed)) return trimmed
  return rewriteLocalGpuSiteUrl(resolveConfigUrl(raw))
}

const CONFIG_URL_KEY = /Url$/i

/** Réécrit les champs `*Url` relatifs après fusion de gpu.config. */
export function resolveConfigUrlsInRecord(target: Record<string, unknown>): void {
  if (!gpuClientConfigScriptUrl) return
  for (const [key, val] of Object.entries(target)) {
    if (typeof val !== 'string' || !val.trim()) continue
    if (!CONFIG_URL_KEY.test(key)) continue
    if (isAbsoluteUrl(val.trim())) continue
    if (isGpuDevProxyPath(val.trim())) continue
    target[key] = resolveConfigUrl(val)
  }
}

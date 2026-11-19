import config from '@/lib/config'

/**
 * Racine web pour charger `json-data/*.json` (limites région / département).
 *
 * - Démo Vite / GitHub Pages : fichiers sous `public/json-data/` → `import.meta.env.BASE_URL`.
 * - Intégration gpu-site : fichiers à la racine du site (`/json-data/…`), pas sous `/map/` ;
 *   `gpu.config.baseUrl === "/"` ou URL absolue même origine que la page.
 */
export function resolveLimitGeoJsonDataRoot(
  fallbackBase = import.meta.env.BASE_URL || '/',
): string {
  const baseUrlRaw = typeof config.baseUrl === 'string' ? config.baseUrl.trim() : ''
  if (!baseUrlRaw) return normalizeRoot(fallbackBase)

  if (baseUrlRaw === '/') {
    if (typeof window !== 'undefined') {
      return normalizeRoot(`${window.location.origin}/`)
    }
    return '/'
  }

  if (/^https?:\/\//i.test(baseUrlRaw) || baseUrlRaw.startsWith('//')) {
    try {
      const resolved = new URL(baseUrlRaw.endsWith('/') ? baseUrlRaw : `${baseUrlRaw}/`)
      if (typeof window === 'undefined' || resolved.origin === window.location.origin) {
        return normalizeRoot(resolved.href)
      }
    } catch {
      /* fall through */
    }
    return normalizeRoot(fallbackBase)
  }

  if (baseUrlRaw.startsWith('/') && typeof window !== 'undefined') {
    const resolved = new URL(
      baseUrlRaw.endsWith('/') ? baseUrlRaw : `${baseUrlRaw}/`,
      window.location.origin,
    )
    return normalizeRoot(resolved.href)
  }

  return normalizeRoot(fallbackBase)
}

export function limitGeoJsonAssetUrl(
  fileName: string,
  fallbackBase = import.meta.env.BASE_URL || '/',
): string {
  const root = resolveLimitGeoJsonDataRoot(fallbackBase)
  const path = fileName.replace(/^\//, '')
  return `${root}json-data/${path}`
}

function normalizeRoot(root: string): string {
  return root.endsWith('/') ? root : `${root}/`
}

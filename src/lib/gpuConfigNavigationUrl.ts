import config from '@/lib/config'
import { resolveGpuSiteNavigationUrl } from '@/lib/fiche/ficheGpuSiteUrls'

export type GpuConfigUrlPlaceholders = {
  documentId?: string
  procedureId?: string
  parcelId?: string
  gridName?: string
  fileName?: string
  partition?: string
}

type NavigationTemplateKey = 'documentViewUrl' | 'procedureViewUrl'

function readConfigString(key: string): string | null {
  const raw = config[key]
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length ? trimmed : null
}

function placeholders(): GpuConfigUrlPlaceholders {
  const raw = config.urlPlaceholders
  if (!raw || typeof raw !== 'object') return {}
  return raw
}

/**
 * Remplace le segment placeholder sans toucher au reste de l’URL (ex. ne pas remplacer les `0` de 127.0.0.1).
 */
export function replaceGpuConfigUrlPlaceholder(
  template: string,
  placeholder: string,
  value: string,
): string {
  const encoded = encodeURIComponent(value)
  if (!placeholder) return template

  const trail = `/${placeholder}`
  if (template.endsWith(trail)) {
    return `${template.slice(0, -trail.length)}/${encoded}`
  }

  if (template.endsWith(placeholder)) {
    const before = template.slice(0, -placeholder.length)
    if (before.endsWith('/')) {
      return `${before}${encoded}`
    }
  }

  if (placeholder.length >= 8) {
    return template.split(placeholder).join(encoded)
  }

  return template
}

/**
 * Remplace le placeholder gpu-client-config par un identifiant réel
 * (routes Symfony générées côté gpu-site — résistant aux changements de chemin).
 */
export function gpuNavigationUrlFromConfigTemplate(
  templateKey: NavigationTemplateKey,
  placeholderKey: keyof GpuConfigUrlPlaceholders,
  id: string,
): string | undefined {
  const template = readConfigString(templateKey)
  if (!template) return undefined
  const value = id.trim()
  if (!value) return undefined

  const ph = placeholders()[placeholderKey]
  if (!ph) return undefined

  const href = replaceGpuConfigUrlPlaceholder(template, ph, value)
  return resolveGpuSiteNavigationUrl(href)
}

import { gpuSiteNavigationUrlFromProxy } from '@/lib/demo/gpuDevProxy'
import { resolveConfigUrl } from '@/lib/configUrls'
import { gpuNavigationUrlFromConfigTemplate } from '@/lib/gpuConfigNavigationUrl'

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('//')
}

function gpuSiteBaseOrigin(): string | null {
  if (typeof window === 'undefined') return null
  const resolved = resolveConfigUrl('/')
  try {
    return new URL(resolved).origin
  } catch {
    return window.location.origin
  }
}

/**
 * Chemin ou URL gpu-site (document, procédure, viewUrl API) → lien utilisable dans la SPA :
 * base = hôte du script gpu-client-config si la page est sur un autre origine (démo Vite).
 */
export function resolveGpuSiteNavigationUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  if (trimmed.includes('__gpu_dev_proxy__')) {
    return maybeAbsoluteGpuUrl(gpuSiteNavigationUrlFromProxy(trimmed))
  }

  const href = isAbsoluteUrl(trimmed)
    ? trimmed
    : resolveConfigUrl(trimmed.startsWith('/') ? trimmed : `/${trimmed}`)

  return maybeAbsoluteGpuUrl(href)
}

/**
 * Lien fiche document gpu-site (`gpu_document_view_by_id` via `documentViewUrl` config).
 * Absolu si l’hôte gpu diffère de la page SPA.
 */
export function resolveGpuDocumentViewUrl(documentId: string): string {
  const fromConfig = gpuNavigationUrlFromConfigTemplate('documentViewUrl', 'documentId', documentId)
  if (fromConfig) return fromConfig
  const id = documentId.trim()
  return resolveGpuSiteNavigationUrl(`/document/${encodeURIComponent(id)}`)
}

/** Lien fiche procédure gpu-site (`gpu_procedure_view` via `procedureViewUrl` config). */
export function resolveGpuProcedureViewUrl(procedureId: string): string {
  const fromConfig = gpuNavigationUrlFromConfigTemplate(
    'procedureViewUrl',
    'procedureId',
    procedureId,
  )
  if (fromConfig) return fromConfig
  const id = procedureId.trim()
  return resolveGpuSiteNavigationUrl(`/procedure/view/${encodeURIComponent(id)}`)
}

function maybeAbsoluteGpuUrl(resolvedHref: string): string {
  if (typeof window === 'undefined') return resolvedHref
  try {
    const target = new URL(resolvedHref, window.location.origin)
    const gpuOrigin = gpuSiteBaseOrigin()
    if (gpuOrigin && target.origin !== window.location.origin && target.origin === gpuOrigin) {
      return target.href
    }
    if (target.origin === window.location.origin) {
      return `${target.pathname}${target.search}${target.hash}`
    }
    return target.href
  } catch {
    return resolvedHref
  }
}

/** Priorité : `viewUrl` API, `archiveUrl`, lien document par id. */
export function resolveDocumentTileHref(options: {
  viewUrl?: string | null
  archiveUrl?: string | null
  documentId?: string | null
}): string | undefined {
  const view = options.viewUrl?.trim()
  if (view) return resolveGpuSiteNavigationUrl(view)
  const archive = options.archiveUrl?.trim()
  if (archive) return resolveGpuSiteNavigationUrl(archive)
  const id = options.documentId?.trim()
  if (id) return resolveGpuDocumentViewUrl(id)
  return undefined
}

/**
 * Lien tuile document MEC : fiche gpu-site (`/document/{id}`), jamais l’archive ZIP.
 * Si `viewUrl` pointe vers un téléchargement, on ignore et on retombe sur l’id.
 */
export function resolveMecDocumentTileHref(options: {
  documentId?: string | null
  viewUrl?: string | null
}): string | undefined {
  const view = options.viewUrl?.trim()
  if (view && !/\/download\//i.test(view)) {
    return resolveGpuSiteNavigationUrl(view)
  }
  const id = options.documentId?.trim()
  if (id && /^[a-f0-9]{32}$/i.test(id)) {
    return resolveGpuDocumentViewUrl(id)
  }
  return undefined
}

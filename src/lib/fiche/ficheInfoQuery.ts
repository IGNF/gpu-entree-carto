import config from '@/lib/config'
import { getDemoConfig } from '@/lib/demo/demoConfig'
import type { StandardViewerDocument } from '@/lib/types'

const FICHE_CLIENT_STORAGE_KEY = 'ec-fiche-info-client-id'

let ficheRequestSeq = 0

function getOrCreateFicheClientId(): string {
  if (typeof window === 'undefined') return 'ssr'
  try {
    const existing = sessionStorage.getItem(FICHE_CLIENT_STORAGE_KEY)
    if (existing) return existing
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `ec-${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(FICHE_CLIENT_STORAGE_KEY, id)
    return id
  } catch {
    return `ec-${Date.now()}`
  }
}

export function nextFicheInfoRequestSeq(): number {
  ficheRequestSeq += 1
  return ficheRequestSeq
}

/** Document preview injecté par gpu-site / demo-config. */
export function getActivePreviewDocument(): StandardViewerDocument | null {
  const fromConfig = config.document
  if (fromConfig && typeof fromConfig === 'object') {
    const doc: StandardViewerDocument = fromConfig
    return doc
  }
  return getDemoConfig().document ?? null
}

export function appendFicheInfoQueryParams(
  url: URL,
  params: { lon: number; lat: number; zoom: number },
): void {
  url.searchParams.set('lon', String(params.lon))
  url.searchParams.set('lat', String(params.lat))
  url.searchParams.set('zoom', String(Math.round(params.zoom)))
  url.searchParams.set('includeParcel', 'true')

  const preview = getActivePreviewDocument()
  if (preview?.status === 'document.preview' && preview.id) {
    url.searchParams.set('zone', 'validation')
    url.searchParams.set('previewDocumentId', String(preview.id))
    const partition = (preview as { partition?: string }).partition ?? preview.name
    if (typeof partition === 'string' && partition.trim()) {
      url.searchParams.set('partition', partition.trim())
    }
  }

  url.searchParams.set('client', getOrCreateFicheClientId())
  url.searchParams.set('seq', String(nextFicheInfoRequestSeq()))
}

type DocumentBboxSource = {
  bbox?: StandardViewerDocument['bbox'] | number[]
}

export function parseDocumentBbox(
  doc: DocumentBboxSource,
): [number, number, number, number] | null {
  const raw = doc.bbox
  if (!raw) return null
  if (Array.isArray(raw) && raw.length === 4) {
    return raw.every((n) => typeof n === 'number' && Number.isFinite(n))
      ? (raw as [number, number, number, number])
      : null
  }
  if (typeof raw === 'string') {
    const parts = raw.split(/[,;\s]+/).map((s) => Number.parseFloat(s.trim()))
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return [parts[0], parts[1], parts[2], parts[3]]
    }
  }
  return null
}

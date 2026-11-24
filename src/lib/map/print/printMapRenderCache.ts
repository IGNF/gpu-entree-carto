import type OlMap from 'ol/Map'
import type { Extent } from 'ol/extent'

export type PrintMapRenderCacheKeyParts = {
  dpi: number
  mapWidthPx: number
  mapHeightPx: number
  extent: Extent
  layerFingerprint: string
  rotation: number
  /** Largeur CSS de la carte d’aperçu : fixe le pixelRatio et le niveau de tuiles de l’export. */
  previewWidthPx: number
}

function roundExtent(extent: Extent): string {
  return extent.map((value) => value.toFixed(2)).join(',')
}

export function buildVisibleLayerFingerprint(sourceMap: OlMap): string {
  const ids: string[] = []
  for (const layer of sourceMap.getLayers().getArray()) {
    if (!layer.getVisible()) continue
    const id = layer.get('id') ?? layer.get('name') ?? layer.constructor.name
    ids.push(`${String(id)}:${layer.getOpacity()}:${layer.getZIndex() ?? 0}`)
  }
  return ids.join('|')
}

export function buildPrintMapRenderCacheKey(parts: PrintMapRenderCacheKeyParts): string {
  return [
    'map-v2',
    parts.dpi,
    Math.round(parts.previewWidthPx),
    parts.mapWidthPx,
    parts.mapHeightPx,
    roundExtent(parts.extent),
    parts.rotation.toFixed(4),
    parts.layerFingerprint,
  ].join(';')
}

const renderCache = new Map<string, HTMLCanvasElement>()

export function getCachedPrintMapCanvas(key: string): HTMLCanvasElement | null {
  const cached = renderCache.get(key)
  if (!cached) return null
  const copy = document.createElement('canvas')
  copy.width = cached.width
  copy.height = cached.height
  copy.getContext('2d')?.drawImage(cached, 0, 0)
  return copy
}

export function storePrintMapCanvasCache(key: string, canvas: HTMLCanvasElement): void {
  const stored = document.createElement('canvas')
  stored.width = canvas.width
  stored.height = canvas.height
  stored.getContext('2d')?.drawImage(canvas, 0, 0)
  renderCache.set(key, stored)
  if (renderCache.size > 4) {
    const oldest = renderCache.keys().next().value
    if (oldest) renderCache.delete(oldest)
  }
}

export function clearPrintMapRenderCache(): void {
  renderCache.clear()
}

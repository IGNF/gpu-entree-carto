import Map from 'ol/Map'
import View from 'ol/View'
import type { Extent } from 'ol/extent'
import { rebuildPrintPreviewMap } from '@/lib/map/print/cloneMapLayers'
import { mergeMapLayerCanvases } from '@/lib/map/print/mapExport'
import { waitForMapExportReady } from '@/lib/map/print/waitForMapExportReady'
import {
  getCachedPrintMapCanvas,
  storePrintMapCanvasCache,
} from '@/lib/map/print/printMapRenderCache'

let offscreenHost: HTMLDivElement | null = null

function getOffscreenPrintMapHost(): HTMLDivElement {
  if (typeof document === 'undefined') {
    throw new Error('Export carte indisponible hors navigateur.')
  }
  if (!offscreenHost) {
    offscreenHost = document.createElement('div')
    offscreenHost.setAttribute('aria-hidden', 'true')
    offscreenHost.style.cssText =
      'position:fixed;left:-100000px;top:0;overflow:hidden;visibility:hidden;pointer-events:none;'
    document.body.appendChild(offscreenHost)
  }
  return offscreenHost
}

export type OffscreenPrintMapExportOptions = {
  widthPx: number
  heightPx: number
  extent: Extent
  cacheKey?: string
  onStage?: (label: string) => void
  onTileProgress?: (loadedTiles: number, pendingTiles: number) => void
}

/**
 * Rasterise la carte pour l’export sans modifier la carte d’aperçu visible
 * (évite flash, fausses « vues personnalisées » et captures de tuiles incomplètes).
 */
export async function renderOffscreenPrintMapCanvas(
  previewMap: Map,
  options: OffscreenPrintMapExportOptions,
): Promise<HTMLCanvasElement> {
  const { widthPx, heightPx, extent } = options
  if (widthPx < 16 || heightPx < 16) {
    throw new Error('Dimensions carte invalides pour l’export (largeur ou hauteur nulle).')
  }
  if (options.cacheKey) {
    const cached = getCachedPrintMapCanvas(options.cacheKey)
    if (cached) {
      options.onStage?.('Carte réutilisée depuis le cache…')
      return cached
    }
  }
  const host = getOffscreenPrintMapHost()
  host.style.width = `${widthPx}px`
  host.style.height = `${heightPx}px`

  const previewView = previewMap.getView()
  const exportView = new View({
    projection: previewView.getProjection(),
    rotation: previewView.getRotation(),
  })

  const exportMap = new Map({
    target: host,
    view: exportView,
    controls: [],
    interactions: [],
  })

  try {
    options.onStage?.('Préparation de la carte haute résolution…')
    rebuildPrintPreviewMap(previewMap, exportMap, { syncViewFromSource: false })
    exportMap.setSize([widthPx, heightPx])
    exportView.fit(extent, { size: [widthPx, heightPx], nearest: true, duration: 0 })

    options.onStage?.('Chargement des tuiles cartographiques…')
    await waitForMapExportReady(exportMap, {
      timeoutMs: 120_000,
      stablePasses: 2,
      onProgress: ({ pendingTiles, loadedTiles }) => {
        options.onTileProgress?.(loadedTiles, pendingTiles)
      },
    })

    options.onStage?.('Rasterisation de la carte…')
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = widthPx
    exportCanvas.height = heightPx
    const exportCtx = exportCanvas.getContext('2d')
    if (!exportCtx) {
      throw new Error('Impossible de récupérer le contexte 2D pour le canvas d’export.')
    }
    const viewportEl = exportMap.getViewport()
    if (!viewportEl) {
      throw new Error('Viewport carte indisponible.')
    }
    mergeMapLayerCanvases(viewportEl, exportCtx)
    if (options.cacheKey) {
      storePrintMapCanvasCache(options.cacheKey, exportCanvas)
    }
    return exportCanvas
  } finally {
    exportMap.setTarget(undefined)
    exportMap.dispose()
  }
}

import { assertCanvasUsable } from '@/lib/map/print/printCanvasMemory'
import Map from 'ol/Map'
import View from 'ol/View'
import type { Extent } from 'ol/extent'
import { rebuildPrintPreviewMap } from '@/lib/map/print/cloneMapLayers'
import { mergeMapLayerCanvases } from '@/lib/map/print/mapExport'
import { printExportPixelRatio } from '@/lib/map/print/printExportPixelRatio'
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
  /** Interrompt le rendu (préchauffage abandonné) : rejette avec une `AbortError`, sans cache. */
  signal?: AbortSignal
  /** Tuiles pas toutes chargées dans le délai (réseau lent) : carte exportée telle quelle, sans cache. */
  onIncomplete?: () => void
}

/** Rendus en cours par clé de cache (préchauffage + export simultanés → un seul rendu). */
const inflightRenders = new globalThis.Map<string, Promise<void>>()

/**
 * Rasterise la carte pour l’export sans modifier la carte d’aperçu visible
 * (évite flash, fausses « vues personnalisées » et captures de tuiles incomplètes).
 */
export async function renderOffscreenPrintMapCanvas(
  previewMap: Map,
  options: OffscreenPrintMapExportOptions,
): Promise<HTMLCanvasElement> {
  const { widthPx, heightPx } = options
  if (widthPx < 16 || heightPx < 16) {
    throw new Error('Dimensions carte invalides pour l’export (largeur ou hauteur nulle).')
  }
  const { cacheKey } = options
  if (cacheKey) {
    const pending = inflightRenders.get(cacheKey)
    if (pending) {
      options.onStage?.('Chargement des tuiles cartographiques…')
      await pending
    }
    const cached = getCachedPrintMapCanvas(cacheKey)
    if (cached) {
      options.onStage?.('Carte réutilisée depuis le cache…')
      return cached
    }
  }
  const render = renderUncached(previewMap, options)
  if (!cacheKey) return render
  // Ne rejette jamais : sert seulement à attendre la fin du rendu (sinon rejet non géré si interrompu).
  const done = render.then(
    () => {},
    () => {},
  )
  inflightRenders.set(cacheKey, done)
  try {
    return await render
  } finally {
    if (inflightRenders.get(cacheKey) === done) inflightRenders.delete(cacheKey)
  }
}

async function renderUncached(
  previewMap: Map,
  options: OffscreenPrintMapExportOptions,
): Promise<HTMLCanvasElement> {
  const { widthPx, heightPx, extent } = options
  // Même emprise que l’aperçu, rendue à `pixelRatio` (voir printExportPixelRatio).
  const pixelRatio = printExportPixelRatio(widthPx, previewMap.getSize()?.[0] ?? widthPx)
  const cssWidth = Math.max(1, Math.round(widthPx / pixelRatio))
  const cssHeight = Math.max(1, Math.round(heightPx / pixelRatio))
  const host = getOffscreenPrintMapHost()
  host.style.width = `${cssWidth}px`
  host.style.height = `${cssHeight}px`

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
    pixelRatio,
  })

  try {
    options.onStage?.('Préparation de la carte haute résolution…')
    rebuildPrintPreviewMap(previewMap, exportMap, { syncViewFromSource: false })
    exportMap.setSize([cssWidth, cssHeight])
    exportView.fit(extent, { size: [cssWidth, cssHeight], duration: 0 })

    options.onStage?.('Chargement des tuiles cartographiques…')
    const { timedOut } = await waitForMapExportReady(exportMap, {
      timeoutMs: 120_000,
      // Export : mieux vaut une carte avec quelques tuiles manquantes qu’aucun fichier (réseau mobile lent).
      resolveOnTimeout: Boolean(options.onIncomplete),
      stablePasses: 2,
      signal: options.signal,
      onProgress: ({ pendingTiles, loadedTiles }) => {
        options.onTileProgress?.(loadedTiles, pendingTiles)
      },
    })

    options.onStage?.('Rasterisation de la carte…')
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = widthPx
    exportCanvas.height = heightPx
    const exportCtx = assertCanvasUsable(exportCanvas)
    const viewportEl = exportMap.getViewport()
    if (!viewportEl) {
      throw new Error('Viewport carte indisponible.')
    }
    mergeMapLayerCanvases(viewportEl, exportCtx, widthPx / cssWidth)
    if (timedOut) options.onIncomplete?.()
    else if (options.cacheKey) {
      storePrintMapCanvasCache(options.cacheKey, exportCanvas)
    }
    return exportCanvas
  } finally {
    exportMap.setTarget(undefined)
    exportMap.dispose()
  }
}

import type Map from 'ol/Map'
import { waitForMapRender } from '@/lib/map/print/waitForMapRender'

function mergeMapCanvases(mapViewport: HTMLElement, targetCtx: CanvasRenderingContext2D): void {
  const canvases = mapViewport.querySelectorAll('.ol-layer canvas, canvas.ol-layer')
  targetCtx.setTransform(1, 0, 0, 1, 0, 0)
  targetCtx.clearRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height)

  canvases.forEach((layerCanvas) => {
    if (!(layerCanvas instanceof HTMLCanvasElement) || !layerCanvas.width || !layerCanvas.height) {
      return
    }
    const opacity = layerCanvas.parentElement?.style.opacity || layerCanvas.style.opacity
    targetCtx.globalAlpha = opacity === '' ? 1 : Number(opacity)
    const backgroundColor = layerCanvas.parentElement?.style.backgroundColor
    if (backgroundColor) {
      targetCtx.fillStyle = backgroundColor
      targetCtx.fillRect(0, 0, layerCanvas.width, layerCanvas.height)
    }
    const transform = layerCanvas.style.transform
    if (transform) {
      const matrix = transform
        .match(/^matrix\(([^)]*)\)$/)?.[1]
        ?.split(',')
        .map(Number)
      if (matrix?.length === 6) {
        targetCtx.setTransform(...(matrix as [number, number, number, number, number, number]))
      }
    } else {
      const style = getComputedStyle(layerCanvas)
      const scaleX = parseFloat(style.width) / layerCanvas.width
      const scaleY = parseFloat(style.height) / layerCanvas.height
      targetCtx.setTransform(scaleX, 0, 0, scaleY, 0, 0)
    }
    targetCtx.drawImage(layerCanvas, 0, 0)
  })
  targetCtx.globalAlpha = 1
  targetCtx.setTransform(1, 0, 0, 1, 0, 0)
}

export async function renderMapCanvasForExport(
  map: Map,
  widthPx: number,
  heightPx: number,
): Promise<HTMLCanvasElement> {
  const view = map.getView()
  const originalSize = map.getSize()
  const originalCenter = view.getCenter()
  const originalResolution = view.getResolution()
  const viewportEl = map.getViewport()
  if (!viewportEl) {
    throw new Error('Viewport carte indisponible.')
  }
  const originalW = viewportEl.style.width
  const originalH = viewportEl.style.height
  const originalExtent = view.calculateExtent(originalSize ?? undefined)

  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = widthPx
  exportCanvas.height = heightPx

  try {
    map.setSize([widthPx, heightPx])
    viewportEl.style.width = `${widthPx}px`
    viewportEl.style.height = `${heightPx}px`
    view.fit(originalExtent, { size: [widthPx, heightPx], nearest: true, duration: 0 })
    await waitForMapRender(map, 2)
    const export2dContext = exportCanvas.getContext('2d')
    if (!export2dContext) {
      throw new Error('Impossible de récupérer le contexte 2D pour le canvas d’export.')
    }
    mergeMapCanvases(viewportEl, export2dContext)
    return exportCanvas
  } finally {
    map.setSize(originalSize)
    viewportEl.style.width = originalW
    viewportEl.style.height = originalH
    if (originalCenter) view.setCenter(originalCenter)
    if (originalResolution) view.setResolution(originalResolution)
    map.renderSync()
  }
}

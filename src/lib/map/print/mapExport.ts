export function mergeMapLayerCanvases(
  mapViewport: HTMLElement,
  targetCtx: CanvasRenderingContext2D,
): void {
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

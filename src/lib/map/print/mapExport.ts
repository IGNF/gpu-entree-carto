/**
 * Fusionne les canvas des couches d’une carte OL dans `targetCtx`.
 * `pixelRatio` : celui de la carte — les matrices CSS des couches sont en px CSS,
 * le canvas cible en px physiques.
 */
export function mergeMapLayerCanvases(
  mapViewport: HTMLElement,
  targetCtx: CanvasRenderingContext2D,
  pixelRatio = 1,
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
        const [a, b, c, d, e, f] = matrix.map((v) => v * pixelRatio)
        targetCtx.setTransform(a, b, c, d, e, f)
      }
    } else {
      const style = getComputedStyle(layerCanvas)
      const scaleX = parseFloat(style.width) / layerCanvas.width
      const scaleY = parseFloat(style.height) / layerCanvas.height
      targetCtx.setTransform(scaleX * pixelRatio, 0, 0, scaleY * pixelRatio, 0, 0)
    }
    targetCtx.drawImage(layerCanvas, 0, 0)
  })
  targetCtx.globalAlpha = 1
  targetCtx.setTransform(1, 0, 0, 1, 0, 0)
}

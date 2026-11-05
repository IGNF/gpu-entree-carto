import html2canvas from 'html2canvas'

/** Attributions OL compositées sur le raster carte (export PDF/PNG). */
export async function drawAttributionOnMapExport(
  ctx: CanvasRenderingContext2D,
  mapRoot: HTMLElement,
  mapHeightPx: number,
): Promise<void> {
  const attr = mapRoot.querySelector('.ol-attribution')
  if (!(attr instanceof HTMLElement)) return

  const mapRect = mapRoot.getBoundingClientRect()
  const attrRect = attr.getBoundingClientRect()
  if (!mapRect.width || !mapRect.height || !attrRect.width || !attrRect.height) return

  const domToExportScale = mapHeightPx / mapRect.height
  const shot = await html2canvas(attr, {
    backgroundColor: null,
    scale: domToExportScale,
    useCORS: true,
    logging: false,
  })

  const x = (attrRect.left - mapRect.left) * domToExportScale
  const y = (attrRect.top - mapRect.top) * domToExportScale
  const w = attrRect.width * domToExportScale
  const h = attrRect.height * domToExportScale
  ctx.drawImage(shot, x, y, w, h)
}

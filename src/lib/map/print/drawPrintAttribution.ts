import html2canvas from 'html2canvas'

/** Facteur attributions / échelle posé sur la carte d’aperçu (voir printMapUiScale). */
const UI_SCALE_VAR = '--ec-print-ui-scale'

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
  const uiScale = parseFloat(getComputedStyle(mapRoot).getPropertyValue(UI_SCALE_VAR)) || 1
  const shot = await html2canvas(attr, {
    backgroundColor: null,
    scale: 1,
    useCORS: true,
    logging: false,
    // Mise en page directement à la taille d’export dans la copie : un texte de ~2 px CSS
    // agrandi après coup est placé et dessiné à des tailles différentes (lettres espacées).
    onclone: (_doc, clonedAttr) => {
      const clonedMap = clonedAttr.closest<HTMLElement>('.ec-map-print-preview-map')
      clonedMap?.style.setProperty(UI_SCALE_VAR, String(uiScale * domToExportScale))
    },
  })

  const x = (attrRect.left - mapRect.left) * domToExportScale
  const y = (attrRect.top - mapRect.top) * domToExportScale
  const w = attrRect.width * domToExportScale
  const h = attrRect.height * domToExportScale
  ctx.drawImage(shot, x, y, w, h)
}

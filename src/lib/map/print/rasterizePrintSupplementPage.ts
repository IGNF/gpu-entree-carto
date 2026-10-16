import html2canvas from 'html2canvas'
import { convertMmToPx } from '@/lib/map/print/paperFormats'

function buildSupplementRasterHost(
  contentRoot: HTMLElement,
  sliceIndex: number,
  paperWidthPx: number,
  paperHeightPx: number,
  marginPx: number,
  innerWidthPx: number,
  innerHeightPx: number,
): HTMLDivElement {
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-10000px'
  host.style.top = '0'
  host.style.width = `${paperWidthPx}px`
  host.style.height = `${paperHeightPx}px`
  host.style.background = '#ffffff'
  host.style.boxSizing = 'border-box'
  host.style.padding = `${marginPx}px`
  host.style.overflow = 'hidden'

  const viewport = document.createElement('div')
  viewport.style.width = `${innerWidthPx}px`
  viewport.style.height = `${innerHeightPx}px`
  viewport.style.overflow = 'hidden'
  viewport.style.position = 'relative'
  viewport.style.background = '#ffffff'

  const clone = contentRoot.cloneNode(true) as HTMLElement
  clone.style.width = `${innerWidthPx}px`
  clone.style.height = 'auto'
  clone.style.maxHeight = 'none'
  clone.style.overflow = 'visible'
  clone.style.marginTop = `-${sliceIndex * innerHeightPx}px`

  viewport.appendChild(clone)
  host.appendChild(viewport)
  return host
}

async function rasterizeHostToCanvas(
  host: HTMLDivElement,
  paperWidthPx: number,
  paperHeightPx: number,
): Promise<HTMLCanvasElement> {
  const shot = await html2canvas(host, {
    backgroundColor: '#ffffff',
    scale: 1,
    width: paperWidthPx,
    height: paperHeightPx,
    useCORS: true,
    logging: false,
  })
  const canvas = document.createElement('canvas')
  canvas.width = paperWidthPx
  canvas.height = paperHeightPx
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Contexte canvas indisponible.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, paperWidthPx, paperHeightPx)
  ctx.drawImage(shot, 0, 0, paperWidthPx, paperHeightPx)
  return canvas
}

/**
 * Rasterise une tranche d’une page HTML (fiche / légendes) aux dimensions papier + marges.
 */
export async function rasterizePrintSupplementPage(
  contentRoot: HTMLElement,
  sliceIndex: number,
  paperWidthMm: number,
  paperHeightMm: number,
  marginMm: number,
  dpi: number,
): Promise<HTMLCanvasElement> {
  const paperWidthPx = convertMmToPx(paperWidthMm, dpi)
  const paperHeightPx = convertMmToPx(paperHeightMm, dpi)
  const marginPx = convertMmToPx(marginMm, dpi)
  const innerWidthPx = Math.max(0, paperWidthPx - marginPx * 2)
  const innerHeightPx = Math.max(0, paperHeightPx - marginPx * 2)

  const host = buildSupplementRasterHost(
    contentRoot,
    sliceIndex,
    paperWidthPx,
    paperHeightPx,
    marginPx,
    innerWidthPx,
    innerHeightPx,
  )
  document.body.appendChild(host)
  try {
    return await rasterizeHostToCanvas(host, paperWidthPx, paperHeightPx)
  } finally {
    host.remove()
  }
}

/** Toutes les tranches d’une section (réutilise le même contenu cloné, sans navigation UI). */
export async function rasterizePrintSupplementSlices(
  contentRoot: HTMLElement,
  sliceCount: number,
  paperWidthMm: number,
  paperHeightMm: number,
  marginMm: number,
  dpi: number,
): Promise<HTMLCanvasElement[]> {
  const paperWidthPx = convertMmToPx(paperWidthMm, dpi)
  const paperHeightPx = convertMmToPx(paperHeightMm, dpi)
  const marginPx = convertMmToPx(marginMm, dpi)
  const innerWidthPx = Math.max(0, paperWidthPx - marginPx * 2)
  const innerHeightPx = Math.max(0, paperHeightPx - marginPx * 2)
  const count = Math.max(1, sliceCount)
  const canvases: HTMLCanvasElement[] = []

  for (let sliceIndex = 0; sliceIndex < count; sliceIndex += 1) {
    const host = buildSupplementRasterHost(
      contentRoot,
      sliceIndex,
      paperWidthPx,
      paperHeightPx,
      marginPx,
      innerWidthPx,
      innerHeightPx,
    )
    document.body.appendChild(host)
    try {
      canvases.push(await rasterizeHostToCanvas(host, paperWidthPx, paperHeightPx))
    } finally {
      host.remove()
    }
  }
  return canvases
}

import { convertMmToPx } from '@/lib/map/print/paperFormats'

export type PrintSupplementInnerPx = {
  paperWidthPx: number
  paperHeightPx: number
  marginPx: number
  innerWidthPx: number
  innerHeightPx: number
}

/** Repères feuille à feuille (pas les groupes englobants qui gonflent la hauteur). */
const SUPPLEMENT_CONTENT_MARKERS =
  '.ec-print-fiche__title, .ec-print-legends__title, .ec-print-fiche__section, .ec-fiche-info__body, .ec-layer-legends__item'

export function computePrintSupplementInnerPx(
  paperWidthMm: number,
  paperHeightMm: number,
  marginMm: number,
  dpi: number,
): PrintSupplementInnerPx {
  const paperWidthPx = convertMmToPx(paperWidthMm, dpi)
  const paperHeightPx = convertMmToPx(paperHeightMm, dpi)
  const marginPx = convertMmToPx(marginMm, dpi)
  return {
    paperWidthPx,
    paperHeightPx,
    marginPx,
    innerWidthPx: Math.max(0, paperWidthPx - marginPx * 2),
    innerHeightPx: Math.max(0, paperHeightPx - marginPx * 2),
  }
}

/** Tailles relatives à la largeur utile de la feuille (aperçu = export). */
export function printSupplementCssVars(innerWidthPx: number): Record<string, string> {
  const w = Math.max(innerWidthPx, 120)
  return {
    '--print-inner-width': `${w}px`,
    '--print-body-font': `${Math.max(9, Math.round(w * 0.028))}px`,
    '--print-title-font': `${Math.max(13, Math.round(w * 0.044))}px`,
    '--print-section-font': `${Math.max(11, Math.round(w * 0.035))}px`,
    '--print-small-font': `${Math.max(8, Math.round(w * 0.024))}px`,
    '--print-cadastre-font': `${Math.max(7, Math.round(w * 0.019))}px`,
    '--print-cadastre-headline-font': `${Math.max(8, Math.round(w * 0.022))}px`,
    '--print-img-max': `${Math.round(w * 0.16)}px`,
    '--print-legend-img-max': `${Math.round(w * 0.11)}px`,
    '--print-block-gap': `${Math.max(8, Math.round(w * 0.014))}px`,
    '--print-map-title-font': `${Math.max(12, Math.round(w * 0.046))}px`,
  }
}

export async function waitForPrintSupplementImages(root: ParentNode): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        }),
    ),
  )
}

function supplementContentElements(page: HTMLElement): HTMLElement[] {
  return Array.from(page.querySelectorAll(SUPPLEMENT_CONTENT_MARKERS)).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  )
}

function elementTopInPage(el: HTMLElement, page: HTMLElement): number {
  const pageRect = page.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  return elRect.top - pageRect.top
}

function elementBottomInPage(el: HTMLElement, page: HTMLElement): number {
  return elementTopInPage(el, page) + el.offsetHeight
}

function measurePageContentHeight(page: HTMLElement): number {
  let maxBottom = 0
  for (const el of supplementContentElements(page)) {
    if (el.offsetHeight < 0.5) continue
    maxBottom = Math.max(maxBottom, elementBottomInPage(el, page))
  }
  if (maxBottom > 0) return Math.ceil(maxBottom)

  const content = page.parentElement
  if (content?.classList.contains('print-supplement-measure__content')) {
    return Math.max(content.scrollHeight, page.offsetHeight, 1)
  }
  return Math.max(page.offsetHeight, 1)
}

function sliceHasVisibleContent(
  page: HTMLElement,
  sliceIndex: number,
  pageHeightPx: number,
  minOverlapPx: number,
): boolean {
  const sliceStart = sliceIndex * pageHeightPx
  const sliceEnd = sliceStart + pageHeightPx
  for (const el of supplementContentElements(page)) {
    if (el.offsetHeight < 0.5) continue
    const top = elementTopInPage(el, page)
    const bottom = top + el.offsetHeight
    const overlap = Math.min(bottom, sliceEnd) - Math.max(top, sliceStart)
    if (overlap >= minOverlapPx) return true
  }
  return false
}

/** Hauteur utile du contenu annexes (px export, même gabarit que la feuille). */
function queryHTMLElement(root: ParentNode, selector: string): HTMLElement | null {
  const el = root.querySelector(selector)
  return el instanceof HTMLElement ? el : null
}

export function measureSupplementContentHeight(root: HTMLElement): number {
  const page = root.matches('.ec-print-supplement-page')
    ? root
    : queryHTMLElement(root, '.ec-print-supplement-page')
  if (!page) {
    const content = queryHTMLElement(root, '.print-supplement-measure__content')
    return content ? Math.max(content.scrollHeight, 1) : Math.max(root.scrollHeight, 1)
  }
  return measurePageContentHeight(page)
}

/**
 * Nombre de feuilles annexes à partir du bloc de mesure hors écran
 * (`print-supplement-measure__viewport` + `__content`).
 */
export function countSupplementPageSlices(measureRoot: HTMLElement, pageHeightPx: number): number {
  if (!Number.isFinite(pageHeightPx) || pageHeightPx <= 0) return 1

  const page = queryHTMLElement(measureRoot, '.ec-print-supplement-page')
  if (!page) return 1

  const contentEl = queryHTMLElement(measureRoot, '.print-supplement-measure__content')
  const fromLayout = measurePageContentHeight(page)
  const fromScroll = contentEl?.scrollHeight ?? page.scrollHeight

  const contentHeight =
    fromLayout > 0 && fromScroll > fromLayout * 1.08
      ? fromLayout
      : fromLayout > 0
        ? Math.max(fromLayout, fromScroll)
        : fromScroll

  if (contentHeight <= pageHeightPx + 2) return 1

  let count = Math.ceil(contentHeight / pageHeightPx)
  const minOverlapPx = Math.max(8, pageHeightPx * 0.02)

  while (count > 1 && !sliceHasVisibleContent(page, count - 1, pageHeightPx, minOverlapPx)) {
    count -= 1
  }

  return Math.max(1, count)
}

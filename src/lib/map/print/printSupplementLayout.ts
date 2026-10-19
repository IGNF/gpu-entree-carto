import { convertMmToPx } from '@/lib/map/print/paperFormats'
import { countSupplementSlices } from '@/lib/map/print/printPageTypes'

export type PrintSupplementInnerPx = {
  paperWidthPx: number
  paperHeightPx: number
  marginPx: number
  innerWidthPx: number
  innerHeightPx: number
}

/**
 * Repères feuille à feuille (pagination) — blocs indivisibles, pas de conteneurs larges
 * (`.ec-fiche-info__body` / `.ec-print-fiche__section` provoquent des coupures incorrectes).
 */
const SUPPLEMENT_PAGINATION_MARKERS = [
  '.ec-print-fiche__title',
  '.ec-print-legends__title',
  '.ec-print-fiche__section-title',
  '.ec-print-legends__group-title',
  '.ec-print-fiche__cadastre-headline',
  '.ec-print-fiche__cadastre-dl',
  '.ec-fiche-info__section-title',
  '.ec-fiche-info__sup-group-title',
  '.ec-fiche-info__rules-section-title',
  '.ec-fiche-info__callout',
  '.ec-fiche-info__rule-row',
  '.ec-fiche-info__tile',
  '.ec-fiche-info__doc-card',
  '.ec-layer-legends__item',
].join(', ')

/** Masquage aperçu / export : mêmes repères fins (ne jamais masquer un conteneur entier). */
const SUPPLEMENT_VISIBILITY_MARKERS = SUPPLEMENT_PAGINATION_MARKERS

/** Réinitialisation après changement de tranche (inclut d’anciens repères grossiers). */
const SUPPLEMENT_VISIBILITY_RESET_MARKERS = `${SUPPLEMENT_VISIBILITY_MARKERS}, .ec-fiche-info__body, .ec-print-fiche__section`

/** Tolérance verticale pour regrouper deux colonnes de légende sur une même ligne. */
const LEGEND_ROW_TOP_TOLERANCE_PX = 10

export type SupplementSlicePlan = {
  sliceCount: number
  sliceStarts: number[]
}

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

/**
 * Typo et images en mm (taille physique stable A4 → A0), converties au DPI d’export.
 */
export function printSupplementCssVars(innerWidthPx: number, dpi: number): Record<string, string> {
  const px = (mm: number) => `${convertMmToPx(mm, dpi)}px`
  return {
    '--print-inner-width': `${Math.max(innerWidthPx, 120)}px`,
    '--print-body-font': px(2.8),
    '--print-title-font': px(4.5),
    '--print-section-font': px(3.4),
    '--print-small-font': px(2.4),
    '--print-fiche-label-font': px(2.5),
    '--print-fiche-desc-font': px(2.2),
    '--print-img-max': px(16),
    '--print-legend-img-max': px(11),
    '--print-block-gap': px(2),
    '--print-map-title-font': px(5),
  }
}

export type WaitForPrintSupplementImagesOptions = {
  timeoutMs?: number
  onImageSettled?: (
    img: HTMLImageElement,
    reason: 'complete' | 'load' | 'error' | 'timeout',
  ) => void
}

export async function waitForPrintSupplementImages(
  root: ParentNode,
  options: WaitForPrintSupplementImagesOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 8_000
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          let settled = false
          const finish = (reason: 'complete' | 'load' | 'error' | 'timeout') => {
            if (settled) return
            settled = true
            options.onImageSettled?.(img, reason)
            resolve()
          }
          if (img.complete) {
            finish('complete')
            return
          }
          const timer = window.setTimeout(() => finish('timeout'), timeoutMs)
          const done = (reason: 'load' | 'error') => {
            window.clearTimeout(timer)
            finish(reason)
          }
          img.addEventListener('load', () => done('load'), { once: true })
          img.addEventListener('error', () => done('error'), { once: true })
        }),
    ),
  )
}

function supplementMarkerElements(page: HTMLElement, selectors: string): HTMLElement[] {
  return Array.from(page.querySelectorAll(selectors)).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  )
}

function supplementPaginationElements(page: HTMLElement): HTMLElement[] {
  return supplementMarkerElements(page, SUPPLEMENT_PAGINATION_MARKERS)
}

function supplementVisibilityElements(page: HTMLElement): HTMLElement[] {
  return supplementMarkerElements(page, SUPPLEMENT_VISIBILITY_MARKERS)
}

/**
 * Position verticale dans la page (repère export, px non transformés).
 * `layoutScale` : facteur `transform: scale()` appliqué à un ancêtre (aperçu) ; 1 en mesure / export.
 */
function elementTopInPage(el: HTMLElement, page: HTMLElement, layoutScale = 1): number {
  const scale = layoutScale > 0 ? layoutScale : 1
  const pageRect = page.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  return (elRect.top - pageRect.top) / scale
}

function elementHeight(el: HTMLElement, layoutScale = 1): number {
  const scale = layoutScale > 0 ? layoutScale : 1
  const rect = el.getBoundingClientRect()
  return Math.max(el.offsetHeight, rect.height / scale, 0)
}

function queryHTMLElement(root: ParentNode, selector: string): HTMLElement | null {
  const el = root.querySelector(selector)
  return el instanceof HTMLElement ? el : null
}

function paginationMarkerBottom(page: HTMLElement): number {
  let markerBottom = 0
  for (const el of supplementPaginationElements(page)) {
    const h = elementHeight(el)
    if (h < 0.5) continue
    markerBottom = Math.max(markerBottom, elementTopInPage(el, page) + h)
  }
  return markerBottom > 0 ? Math.ceil(markerBottom) : 0
}

/**
 * Hauteur utile pour paginer une page annexe déjà rendue (repères DOM, pas scroll « fantôme »).
 * Fiches : repères uniquement (le scrollHeight du HTML injecté peut être très surévalué).
 * Légendes : repères + scroll + dernier item.
 */
export function resolveSupplementContentHeightForPage(page: HTMLElement): number {
  const blocks = contentBlocksForPage(page)
  const blockBottom = maxContentBottom(page, blocks)
  const markerBottom = paginationMarkerBottom(page)

  if (page.classList.contains('ec-print-fiche')) {
    return Math.max(blockBottom, markerBottom, 1)
  }

  if (page.classList.contains('ec-print-legends')) {
    const scrollBottom = Math.max(page.scrollHeight, page.offsetHeight, 1)
    return Math.max(blockBottom, markerBottom, scrollBottom, 1)
  }

  return Math.max(blockBottom, markerBottom, page.scrollHeight, 1)
}

/** Hauteur utile du contenu annexes (px export, même gabarit que la feuille). */
export function measureSupplementContentHeight(root: HTMLElement): number {
  const page = root.matches('.ec-print-supplement-page')
    ? root
    : queryHTMLElement(root, '.ec-print-supplement-page')
  if (page) return resolveSupplementContentHeightForPage(page)

  const content = queryHTMLElement(root, '.print-supplement-measure__content')
  return Math.max(content?.scrollHeight ?? 0, content?.offsetHeight ?? 0, root.scrollHeight, 1)
}

/** Hauteur retenue pour paginer (bloc de mesure hors écran). */
export function resolveSupplementContentHeight(measureRoot: HTMLElement): number {
  const page = queryHTMLElement(measureRoot, '.ec-print-supplement-page')
  if (!page) return Math.max(1, measureSupplementContentHeight(measureRoot))
  return resolveSupplementContentHeightForPage(page)
}

/** Attend que la hauteur mesurée se stabilise (images, polices, grille légende). */
export async function waitForSupplementPageHeightStable(
  page: HTMLElement,
  options: { timeoutMs?: number; stableFrames?: number } = {},
): Promise<number> {
  const timeoutMs = options.timeoutMs ?? 5_000
  const stableFrames = options.stableFrames ?? 4
  const deadline = performance.now() + timeoutMs
  let last = -1
  let stable = 0

  while (performance.now() < deadline) {
    page.getBoundingClientRect()
    const height = resolveSupplementContentHeightForPage(page)
    if (last >= 0 && Math.abs(height - last) < 2) stable += 1
    else stable = 0
    last = height
    if (stable >= stableFrames) return height
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }
  return resolveSupplementContentHeightForPage(page)
}

export async function waitForSupplementMeasureHeightStable(
  measureRoot: HTMLElement,
  options?: { timeoutMs?: number; stableFrames?: number },
): Promise<number> {
  const page = queryHTMLElement(measureRoot, '.ec-print-supplement-page')
  if (!page) return resolveSupplementContentHeight(measureRoot)
  return waitForSupplementPageHeightStable(page, options)
}

type ContentBlock = { top: number; height: number; bottom: number }

function nonNestedMarkerElements(page: HTMLElement): HTMLElement[] {
  const all = supplementPaginationElements(page)
  return all.filter((el) => !all.some((other) => other !== el && other.contains(el)))
}

function blockFromElement(
  el: HTMLElement,
  page: HTMLElement,
  layoutScale = 1,
): ContentBlock | null {
  const height = elementHeight(el, layoutScale)
  if (height < 0.5) return null
  const top = elementTopInPage(el, page, layoutScale)
  return { top, height, bottom: top + height }
}

function clusterLegendItemsIntoRows(
  page: HTMLElement,
  itemElements: HTMLElement[],
  layoutScale = 1,
): ContentBlock[] {
  const entries = itemElements
    .map((el) => blockFromElement(el, page, layoutScale))
    .filter((b): b is ContentBlock => b !== null)
    .sort((a, b) => a.top - b.top || a.bottom - b.bottom)

  const rows: ContentBlock[] = []
  for (const entry of entries) {
    const row = rows.find((r) => Math.abs(r.top - entry.top) <= LEGEND_ROW_TOP_TOLERANCE_PX)
    if (row) {
      const top = Math.min(row.top, entry.top)
      const bottom = Math.max(row.bottom, entry.bottom)
      row.top = top
      row.bottom = bottom
      row.height = bottom - top
    } else {
      rows.push({ ...entry })
    }
  }
  return rows
}

function contentBlocksForPage(page: HTMLElement, layoutScale = 1): ContentBlock[] {
  const nonNested = nonNestedMarkerElements(page)
  const legendItems = nonNested.filter((el) => el.classList.contains('ec-layer-legends__item'))
  const otherElements = nonNested.filter((el) => !el.classList.contains('ec-layer-legends__item'))

  const blocks: ContentBlock[] = []
  for (const el of otherElements) {
    const block = blockFromElement(el, page, layoutScale)
    if (block) blocks.push(block)
  }
  blocks.push(...clusterLegendItemsIntoRows(page, legendItems, layoutScale))

  return blocks.sort((a, b) => a.top - b.top || a.bottom - b.bottom)
}

/** Ne pas laisser un titre de groupe seul en bas de page sans la première ligne d’items. */
function adjustCutForLegendGroupTitles(
  page: HTMLElement,
  sliceStart: number,
  cut: number,
  tailZoneStart: number,
  epsilon: number,
  layoutScale = 1,
): number {
  let nextCut = cut
  for (const group of page.querySelectorAll('.ec-print-legends__group')) {
    const title = group.querySelector('.ec-print-legends__group-title')
    if (!(title instanceof HTMLElement)) continue
    const titleBlock = blockFromElement(title, page, layoutScale)
    if (!titleBlock) continue

    const itemEls = Array.from(group.querySelectorAll('.ec-layer-legends__item')).filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    )
    const rowBlocks = clusterLegendItemsIntoRows(page, itemEls, layoutScale)
    const firstRow = rowBlocks[0]
    if (!firstRow) continue

    const titleTop = titleBlock.top
    const titleBottom = titleBlock.bottom

    if (
      titleTop >= tailZoneStart &&
      titleTop < nextCut - epsilon &&
      firstRow.bottom > nextCut + epsilon
    ) {
      nextCut = Math.min(nextCut, titleTop)
    }

    if (
      titleBottom <= nextCut + epsilon &&
      firstRow.top >= nextCut - epsilon &&
      titleTop > sliceStart + epsilon
    ) {
      nextCut = Math.min(nextCut, titleTop)
    }
  }
  return nextCut
}

function maxContentBottom(page: HTMLElement, blocks: ContentBlock[]): number {
  let maxBottom = 0
  for (const b of blocks) maxBottom = Math.max(maxBottom, b.bottom)
  const scrollBottom = Math.max(page.scrollHeight, 1)
  if (page.classList.contains('ec-print-legends')) {
    return Math.max(maxBottom, scrollBottom)
  }
  return maxBottom > 0 ? maxBottom : scrollBottom
}

/**
 * Fin de tranche sans couper un repère (ligne légende 2 col., tuile fiche, …).
 * Retourne le début de la tranche suivante (≤ sliceStart + pageHeight).
 */
export function resolveSupplementSliceEndPx(
  page: HTMLElement,
  sliceStartPx: number,
  pageHeightPx: number,
  layoutScale = 1,
): number {
  if (!Number.isFinite(pageHeightPx) || pageHeightPx <= 0) {
    return sliceStartPx
  }

  const epsilon = Math.max(4, pageHeightPx * 0.008)
  const uniformEnd = sliceStartPx + pageHeightPx
  const blocks = contentBlocksForPage(page, layoutScale)
  let cut = uniformEnd
  const minTailRatio = 0.05
  const tailZoneStart = sliceStartPx + pageHeightPx * (1 - minTailRatio)

  for (const block of blocks) {
    if (
      block.top >= tailZoneStart &&
      block.top < cut - epsilon &&
      block.bottom > cut + epsilon &&
      block.top > sliceStartPx + epsilon
    ) {
      cut = Math.min(cut, block.top)
    }
  }

  for (const block of blocks) {
    if (block.top >= cut - epsilon) break
    if (block.bottom > cut + epsilon && block.top > sliceStartPx + epsilon) {
      cut = Math.min(cut, block.top)
    }
  }

  cut = adjustCutForLegendGroupTitles(page, sliceStartPx, cut, tailZoneStart, epsilon, layoutScale)

  if (cut <= sliceStartPx + epsilon) {
    cut = uniformEnd
  }

  const minAdvancePx = pageHeightPx * 0.18
  if (cut - sliceStartPx < minAdvancePx) {
    cut = uniformEnd
  }

  return Math.min(cut, uniformEnd)
}

/** Début de tranche en enchaînant les coupures repères (index 0-based). */
export function resolveSupplementSliceStartPx(
  page: HTMLElement,
  sliceIndex: number,
  pageHeightPx: number,
  layoutScale = 1,
): number {
  let start = 0
  for (let index = 0; index < sliceIndex; index += 1) {
    start = resolveSupplementSliceEndPx(page, start, pageHeightPx, layoutScale)
  }
  return start
}

/**
 * Découpe verticale sans couper les repères DOM (légendes, sections fiche, …).
 */
export function computeSupplementSlicePlan(
  page: HTMLElement,
  pageHeightPx: number,
): SupplementSlicePlan {
  if (!Number.isFinite(pageHeightPx) || pageHeightPx <= 0) {
    return { sliceCount: 1, sliceStarts: [0] }
  }

  const blocks = contentBlocksForPage(page)
  const maxBottom = maxContentBottom(page, blocks)
  const epsilon = Math.max(4, pageHeightPx * 0.008)

  if (maxBottom <= pageHeightPx + epsilon) {
    return { sliceCount: 1, sliceStarts: [0] }
  }

  const sliceStarts = [0]
  let sliceStart = 0

  while (sliceStart + pageHeightPx < maxBottom - epsilon) {
    const nextStart = resolveSupplementSliceEndPx(page, sliceStart, pageHeightPx)
    if (nextStart >= maxBottom - epsilon) break
    if (sliceStarts[sliceStarts.length - 1] !== nextStart) {
      sliceStarts.push(nextStart)
    }
    sliceStart = nextStart
  }

  return { sliceCount: Math.max(1, sliceStarts.length), sliceStarts }
}

/** Supprime les débuts de tranche quasi vides (pages blanches à l’aperçu). */
export function sanitizeSupplementSliceStarts(
  sliceStarts: number[],
  pageHeightPx: number,
): number[] {
  if (sliceStarts.length <= 1) return sliceStarts.length ? [...sliceStarts] : [0]
  const minGapPx = pageHeightPx * 0.18
  const sanitized: number[] = [sliceStarts[0] ?? 0]
  for (let index = 1; index < sliceStarts.length; index += 1) {
    const start = sliceStarts[index] ?? 0
    const previous = sanitized[sanitized.length - 1] ?? 0
    if (start - previous >= minGapPx - 0.5) {
      sanitized.push(start)
    }
  }
  return sanitized
}

export function buildUniformSupplementSlicePlan(
  contentHeightPx: number,
  pageHeightPx: number,
): SupplementSlicePlan {
  const sliceCount = countSupplementSlices(contentHeightPx, pageHeightPx)
  const sliceStarts: number[] = []
  for (let index = 0; index < sliceCount; index += 1) {
    sliceStarts.push(index * pageHeightPx)
  }
  return { sliceCount: Math.max(1, sliceStarts.length), sliceStarts }
}

export function measureSupplementSlicePlanFromPage(
  page: HTMLElement,
  pageHeightPx: number,
): SupplementSlicePlan {
  const contentHeight = resolveSupplementContentHeightForPage(page)
  const targetCount = countSupplementSlices(contentHeight, pageHeightPx)
  if (targetCount <= 1) return { sliceCount: 1, sliceStarts: [0] }

  const blockPlan = computeSupplementSlicePlan(page, pageHeightPx)
  const starts = sanitizeSupplementSliceStarts(blockPlan.sliceStarts, pageHeightPx)
  if (starts.length >= 2 && starts.length <= targetCount + 1) {
    return { sliceCount: starts.length, sliceStarts: starts }
  }

  return buildUniformSupplementSlicePlan(contentHeight, pageHeightPx)
}

/** Plan de pagination à partir du bloc de mesure hors écran. */
export function measureSupplementSlicePlan(
  measureRoot: HTMLElement,
  pageHeightPx: number,
): SupplementSlicePlan {
  const page = queryHTMLElement(measureRoot, '.ec-print-supplement-page')
  if (!page) return { sliceCount: 1, sliceStarts: [0] }
  return measureSupplementSlicePlanFromPage(page, pageHeightPx)
}

/**
 * Nombre de feuilles annexes à partir du bloc de mesure hors écran
 * (`print-supplement-measure__viewport` + `__content`).
 */
export function countSupplementPageSlices(measureRoot: HTMLElement, pageHeightPx: number): number {
  return measureSupplementSlicePlan(measureRoot, pageHeightPx).sliceCount
}

/**
 * Masque tout repère hors tranche `[sliceStartPx, sliceEndPx)` (aperçu + export).
 * `sliceEndPx` = début de la tranche suivante si la coupure est remontée avant le bas de feuille.
 */
export function hideSupplementElementsForSlice(
  page: HTMLElement,
  sliceStartPx: number,
  sliceEndPx: number,
  layoutScale = 1,
): void {
  if (!Number.isFinite(sliceEndPx) || sliceEndPx <= sliceStartPx + 0.5) return
  const sliceHeightPx = sliceEndPx - sliceStartPx
  const epsilon = Math.max(4, sliceHeightPx * 0.008)

  const shouldHide = (top: number, bottom: number): boolean => {
    if (sliceStartPx > epsilon && top < sliceStartPx + epsilon) return true
    if (bottom <= sliceStartPx + epsilon) return true
    if (top >= sliceEndPx - epsilon) return true
    return top < sliceEndPx - epsilon && bottom > sliceEndPx + epsilon
  }

  for (const el of supplementVisibilityElements(page)) {
    const top = elementTopInPage(el, page, layoutScale)
    const height = elementHeight(el, layoutScale)
    if (height < 0.5) continue
    const bottom = top + height
    el.style.visibility = shouldHide(top, bottom) ? 'hidden' : ''
  }

  const legendItems = supplementVisibilityElements(page).filter((el) =>
    el.classList.contains('ec-layer-legends__item'),
  )
  const rows = clusterLegendItemsIntoRows(page, legendItems, layoutScale)
  for (const row of rows) {
    if (!shouldHide(row.top, row.bottom)) continue
    for (const el of legendItems) {
      const block = blockFromElement(el, page, layoutScale)
      if (!block) continue
      if (Math.abs(block.top - row.top) <= LEGEND_ROW_TOP_TOLERANCE_PX) {
        el.style.visibility = 'hidden'
      }
    }
  }
}

/** @deprecated Préférer {@link hideSupplementElementsForSlice} avec une fin de tranche explicite. */
export function hideSupplementElementsSplitAtSliceBottom(
  page: HTMLElement,
  sliceStartPx: number,
  pageHeightPx: number,
  layoutScale = 1,
): void {
  if (!Number.isFinite(pageHeightPx) || pageHeightPx <= 0) return
  hideSupplementElementsForSlice(page, sliceStartPx, sliceStartPx + pageHeightPx, layoutScale)
}

export function resetSupplementElementVisibility(page: HTMLElement): void {
  for (const el of supplementMarkerElements(page, SUPPLEMENT_VISIBILITY_RESET_MARKERS)) {
    el.style.visibility = ''
  }
}

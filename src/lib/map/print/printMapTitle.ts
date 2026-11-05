import {
  PRINT_SUPPLEMENT_BLOCK_GAP_MM,
  PRINT_SUPPLEMENT_TITLE_FONT_MM,
} from '@/lib/map/print/printSupplementLayout'

/** Nombre maximal de caractères du titre (saisie + export). */
export const PRINT_MAP_TITLE_MAX_CHARS = 100

/** Part maximale de la zone imprimable réservée au titre. */
export const PRINT_MAP_TITLE_MAX_HEIGHT_RATIO = 0.12

/** Part minimale de la zone imprimable garantie à la carte. */
export const PRINT_MAP_MIN_MAP_HEIGHT_RATIO = 0.38

const TITLE_BASE_FONT_MM = PRINT_SUPPLEMENT_TITLE_FONT_MM
const TITLE_LINE_HEIGHT_RATIO = 1.35
const TITLE_VERTICAL_PADDING_MM = PRINT_SUPPLEMENT_BLOCK_GAP_MM
const TITLE_MAX_LINES = 3

export type PrintMapTitleLayout = {
  displayTitle: string
  titleHeightMm: number
  fontSizeMm: number
  lineHeightMm: number
  lineCount: number
}

export function normalizePrintMapTitle(raw: string, maxChars = PRINT_MAP_TITLE_MAX_CHARS): string {
  const trimmed = raw.trim()
  if (trimmed.length <= maxChars) return trimmed
  return `${trimmed.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
}

function fontSizeMmForTitleLength(charCount: number): number {
  if (charCount <= 32) return TITLE_BASE_FONT_MM
  if (charCount <= 56) return TITLE_BASE_FONT_MM * 0.88
  if (charCount <= 80) return TITLE_BASE_FONT_MM * 0.76
  return TITLE_BASE_FONT_MM * 0.65
}

export function wrapPrintMapTitleLines(
  title: string,
  printableWidthMm: number,
  fontSizeMm: number,
  maxLines = TITLE_MAX_LINES,
): string[] {
  if (!title) return []
  const avgCharWidthMm = Math.max(0.35, fontSizeMm * 0.52)
  const charsPerLine = Math.max(8, Math.floor(printableWidthMm / avgCharWidthMm))
  const words = title.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  const pushLine = (line: string): void => {
    if (line) lines.push(line)
  }

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= charsPerLine) {
      current = candidate
      continue
    }
    if (current) pushLine(current)
    if (word.length > charsPerLine) {
      for (let i = 0; i < word.length; i += charsPerLine) {
        pushLine(word.slice(i, i + charsPerLine))
      }
      current = ''
    } else {
      current = word
    }
    if (lines.length >= maxLines) break
  }
  if (lines.length < maxLines && current) pushLine(current)

  if (lines.length > maxLines) {
    const clipped = lines.slice(0, maxLines)
    const last = clipped[maxLines - 1]
    clipped[maxLines - 1] =
      last.length > 1 ? `${last.slice(0, Math.max(1, last.length - 1))}…` : '…'
    return clipped
  }
  return lines
}

export function computePrintMapTitleLayout(
  rawTitle: string,
  printableWidthMm: number,
  printableHeightMm: number,
  hasTitle: boolean,
): PrintMapTitleLayout {
  if (!hasTitle || printableWidthMm <= 0 || printableHeightMm <= 0) {
    return {
      displayTitle: '',
      titleHeightMm: 0,
      fontSizeMm: 0,
      lineHeightMm: 0,
      lineCount: 0,
    }
  }

  const displayTitle = normalizePrintMapTitle(rawTitle)
  if (!displayTitle) {
    return {
      displayTitle: '',
      titleHeightMm: 0,
      fontSizeMm: 0,
      lineHeightMm: 0,
      lineCount: 0,
    }
  }

  const fontSizeMm = fontSizeMmForTitleLength(displayTitle.length)
  const lineHeightMm = fontSizeMm * TITLE_LINE_HEIGHT_RATIO
  const lines = wrapPrintMapTitleLines(displayTitle, printableWidthMm, fontSizeMm)
  const lineCount = Math.max(1, Math.min(TITLE_MAX_LINES, lines.length))

  const maxTitleMm = printableHeightMm * PRINT_MAP_TITLE_MAX_HEIGHT_RATIO
  const minMapMm = printableHeightMm * PRINT_MAP_MIN_MAP_HEIGHT_RATIO
  const cappedByMap = Math.max(0, printableHeightMm - minMapMm)
  const maxAllowedTitleMm = Math.min(maxTitleMm, cappedByMap)

  let titleHeightMm = lineCount * lineHeightMm + TITLE_VERTICAL_PADDING_MM
  titleHeightMm = Math.min(titleHeightMm, maxAllowedTitleMm)

  return {
    displayTitle,
    titleHeightMm,
    fontSizeMm,
    lineHeightMm,
    lineCount,
  }
}

export function drawPrintMapTitleOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  layout: PrintMapTitleLayout,
  dpi: number,
): void {
  if (!layout.displayTitle || canvasWidth <= 0 || canvasHeight <= 0) return

  const mmToPx = dpi / 25.4
  const fontSizePx = layout.fontSizeMm * mmToPx
  const lineHeightPx = layout.lineHeightMm * mmToPx
  const lines = wrapPrintMapTitleLines(layout.displayTitle, canvasWidth / mmToPx, layout.fontSizeMm)

  ctx.fillStyle = '#161616'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = `normal normal 700 ${fontSizePx}px Marianne, arial, sans-serif`

  const paddingPx = TITLE_VERTICAL_PADDING_MM * mmToPx * 0.5
  let y = paddingPx
  for (const line of lines) {
    if (y + lineHeightPx > canvasHeight) break
    ctx.fillText(line, canvasWidth / 2, y, canvasWidth - paddingPx * 2)
    y += lineHeightPx
  }
}

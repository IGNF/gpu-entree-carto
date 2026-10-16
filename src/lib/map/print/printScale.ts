export function computeScaleCoeff(
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
): number {
  const ratioBloc1 = containerWidth / containerHeight
  const ratioBloc2 = contentWidth / contentHeight
  if (ratioBloc2 > ratioBloc1) {
    return containerWidth / contentWidth
  }
  return containerHeight / contentHeight
}

export type ScaleLineSnapshot = {
  mapRect: { width: number; height: number }
  outer: {
    x: number
    y: number
    width: number
    height: number
    backgroundColor: string
  }
  inner: {
    x: number
    y: number
    width: number
    height: number
    borderLeftWidth: string
    borderRightWidth: string
    borderBottomWidth: string
    fontStyle: string
    fontVariant: string
    fontWeight: string
    fontSize: string
    fontFamily: string
    color: string
    text: string
  }
  domScaleCoeff: number
}

export function captureScaleLineSnapshot(
  mapRef: HTMLElement,
  domScaleCoeff = 1,
): ScaleLineSnapshot | null {
  const scaleLine = mapRef.getElementsByClassName('ol-scale-line')[0] as HTMLElement | undefined
  const scaleLineInner = scaleLine?.children[0] as HTMLElement | undefined
  if (!scaleLine || !scaleLineInner) return null

  const mapRect = mapRef.getBoundingClientRect()
  const outerRect = scaleLine.getBoundingClientRect()
  const innerRect = scaleLineInner.getBoundingClientRect()
  if (!mapRect.width || !mapRect.height) return null

  const style = getComputedStyle(scaleLine)
  const styleInner = getComputedStyle(scaleLineInner)

  return {
    mapRect: { width: mapRect.width, height: mapRect.height },
    outer: {
      x: outerRect.left - mapRect.left,
      y: outerRect.top - mapRect.top,
      width: outerRect.width,
      height: outerRect.height,
      backgroundColor: style.backgroundColor || 'rgba(255, 255, 255, 0.75)',
    },
    inner: {
      x: innerRect.left - mapRect.left,
      y: innerRect.top - mapRect.top,
      width: innerRect.width,
      height: innerRect.height,
      borderLeftWidth: styleInner.borderLeftWidth || '0',
      borderRightWidth: styleInner.borderRightWidth || '0',
      borderBottomWidth: styleInner.borderBottomWidth || '0',
      fontStyle: styleInner.fontStyle,
      fontVariant: styleInner.fontVariant,
      fontWeight: styleInner.fontWeight,
      fontSize: styleInner.fontSize,
      fontFamily: styleInner.fontFamily,
      color: styleInner.color || '#333333',
      text: scaleLineInner.textContent || '',
    },
    domScaleCoeff,
  }
}

export function drawScale(
  ctx: CanvasRenderingContext2D,
  mapRef: HTMLElement,
  _canvasWidth: number,
  canvasHeight: number,
  scaleSnapshot: ScaleLineSnapshot | null = null,
  domScaleCoeff = 1,
): void {
  let mapRect: DOMRect | { width: number; height: number; left: number; top: number }
  let outerRect: { left: number; top: number; width: number; height: number }
  let innerRect: { left: number; top: number; width: number; height: number }
  let outerBackgroundColor: string
  let innerBorderLeftWidth: string
  let innerBorderRightWidth: string
  let innerBorderBottomWidth: string
  let innerFontStyle: string
  let innerFontVariant: string
  let innerFontWeight: string
  let innerFontSize: string
  let innerFontFamily: string
  let innerColor: string
  let scaleContent: string

  if (scaleSnapshot) {
    mapRect = {
      width: scaleSnapshot.mapRect.width,
      height: scaleSnapshot.mapRect.height,
      left: 0,
      top: 0,
    }
    outerRect = {
      left: scaleSnapshot.outer.x,
      top: scaleSnapshot.outer.y,
      width: scaleSnapshot.outer.width,
      height: scaleSnapshot.outer.height,
    }
    innerRect = {
      left: scaleSnapshot.inner.x,
      top: scaleSnapshot.inner.y,
      width: scaleSnapshot.inner.width,
      height: scaleSnapshot.inner.height,
    }
    outerBackgroundColor = scaleSnapshot.outer.backgroundColor
    innerBorderLeftWidth = scaleSnapshot.inner.borderLeftWidth
    innerBorderRightWidth = scaleSnapshot.inner.borderRightWidth
    innerBorderBottomWidth = scaleSnapshot.inner.borderBottomWidth
    innerFontStyle = scaleSnapshot.inner.fontStyle
    innerFontVariant = scaleSnapshot.inner.fontVariant
    innerFontWeight = scaleSnapshot.inner.fontWeight
    innerFontSize = scaleSnapshot.inner.fontSize
    innerFontFamily = scaleSnapshot.inner.fontFamily
    innerColor = scaleSnapshot.inner.color
    scaleContent = scaleSnapshot.inner.text
  } else {
    const scaleLine = mapRef.getElementsByClassName('ol-scale-line')[0] as HTMLElement | undefined
    const scaleLineInner = scaleLine?.children[0] as HTMLElement | undefined
    if (!scaleLine || !scaleLineInner) return

    mapRect = mapRef.getBoundingClientRect()
    outerRect = scaleLine.getBoundingClientRect()
    innerRect = scaleLineInner.getBoundingClientRect()
    if (!mapRect.width || !mapRect.height) return

    const style = getComputedStyle(scaleLine)
    const styleInner = getComputedStyle(scaleLineInner)
    outerBackgroundColor = style.backgroundColor || 'rgba(255, 255, 255, 0.75)'
    innerBorderLeftWidth = styleInner.borderLeftWidth || '0'
    innerBorderRightWidth = styleInner.borderRightWidth || '0'
    innerBorderBottomWidth = styleInner.borderBottomWidth || '0'
    innerFontStyle = styleInner.fontStyle
    innerFontVariant = styleInner.fontVariant
    innerFontWeight = styleInner.fontWeight
    innerFontSize = styleInner.fontSize
    innerFontFamily = styleInner.fontFamily
    innerColor = styleInner.color || '#333333'
    scaleContent = scaleLineInner.textContent || ''
  }

  if (!mapRect.width || !mapRect.height) return

  const scaleFactorY = canvasHeight / mapRect.height
  const effectiveDomScaleCoeff = scaleSnapshot ? (scaleSnapshot.domScaleCoeff ?? 1) : domScaleCoeff
  const computedStyleScaleFactor = scaleFactorY * effectiveDomScaleCoeff

  const outerX = (outerRect.left - mapRect.left) * scaleFactorY
  const outerY = (outerRect.top - mapRect.top) * scaleFactorY
  const outerWidth = outerRect.width * scaleFactorY
  const outerHeight = outerRect.height * scaleFactorY
  const innerX = (innerRect.left - mapRect.left) * scaleFactorY
  const innerY = (innerRect.top - mapRect.top) * scaleFactorY
  const innerWidth = innerRect.width * scaleFactorY
  const innerHeight = innerRect.height * scaleFactorY

  const borderLeftWidth = parseFloat(innerBorderLeftWidth || '0') * computedStyleScaleFactor
  const borderRightWidth = parseFloat(innerBorderRightWidth || '0') * computedStyleScaleFactor
  const borderBottomWidth = parseFloat(innerBorderBottomWidth || '0') * computedStyleScaleFactor
  const outerBorderWidth = Math.max(scaleFactorY * 0.75, 1)

  ctx.beginPath()
  ctx.fillStyle = outerBackgroundColor
  ctx.fillRect(outerX, outerY, outerWidth, outerHeight)
  ctx.lineWidth = outerBorderWidth
  ctx.strokeStyle = '#ffffff'
  ctx.strokeRect(outerX, outerY, outerWidth, outerHeight)

  ctx.fillStyle = '#000000'
  if (borderLeftWidth > 0) ctx.fillRect(innerX, innerY, borderLeftWidth, innerHeight)
  if (borderRightWidth > 0) {
    ctx.fillRect(innerX + innerWidth - borderRightWidth, innerY, borderRightWidth, innerHeight)
  }
  if (borderBottomWidth > 0) {
    ctx.fillRect(innerX, innerY + innerHeight - borderBottomWidth, innerWidth, borderBottomWidth)
  }

  const baseFontSize = parseFloat(innerFontSize || '10')
  ctx.font = `${innerFontStyle} ${innerFontVariant} ${innerFontWeight} ${baseFontSize * computedStyleScaleFactor}px ${innerFontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = innerColor
  ctx.fillText(scaleContent, innerX + innerWidth / 2, innerY + innerHeight / 2)
}

function getRenderedLines(element: HTMLElement, text: string): string[] {
  const textNode = element.firstChild
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE || !text) {
    return [text]
  }
  const range = document.createRange()
  const groupedChars: string[] = []
  let currentLineTop: number | null = null
  let currentLine = ''
  for (let i = 0; i < text.length; i += 1) {
    range.setStart(textNode, i)
    range.setEnd(textNode, i + 1)
    const rect = range.getBoundingClientRect()
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      currentLine += text[i]
      continue
    }
    if (currentLineTop === null) currentLineTop = rect.top
    if (Math.abs(rect.top - currentLineTop) > 0.5) {
      groupedChars.push(currentLine)
      currentLine = ''
      currentLineTop = rect.top
    }
    currentLine += text[i]
  }
  if (currentLine) groupedChars.push(currentLine)
  return groupedChars.length ? groupedChars : [text]
}

export function drawTitle(
  ctx: CanvasRenderingContext2D,
  _canvasHeight: number,
  canvasWidth: number,
  printTitle: string,
  titleElement: HTMLElement,
  dpiCoeff = 1,
): void {
  const style = getComputedStyle(titleElement)
  const titleDivWidth = titleElement.clientWidth || canvasWidth / dpiCoeff
  const scaleX = titleDivWidth > 0 ? canvasWidth / (titleDivWidth * dpiCoeff) : 1
  const fontSizeValue = parseInt(style.fontSize, 10)
  const fontSize = (fontSizeValue > 0 ? fontSizeValue : 16) * scaleX * dpiCoeff
  const lineHeight = parseInt(style.lineHeight, 10) * scaleX * dpiCoeff

  ctx.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`
  ctx.fillStyle = style.color || '#3a3a3a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const lines = getRenderedLines(titleElement, printTitle)
  let y = 10 * dpiCoeff
  for (const line of lines) {
    ctx.fillText(line, canvasWidth / 2, y, canvasWidth)
    y += lineHeight
  }
}

import { PDFDocument } from 'pdf-lib'
import { injectDpiInPngBytes } from '@/lib/map/print/pngDpi'
import { isArrayBufferValue } from '@/lib/map/print/printExportTransfer'

/** Points PDF (1/72 in) depuis millimètres papier. */
const MM_TO_PT = 72 / 25.4

type WorkerRequest =
  | {
      id: number
      type: 'png-dpi'
      png: ArrayBuffer
      dpi: number
    }
  | {
      id: number
      type: 'jpeg'
      png: ArrayBuffer
      quality: number
    }
  | {
      id: number
      type: 'pdf'
      pages: ArrayBuffer[]
      paperWidthMm: number
      paperHeightMm: number
      orientation: 'portrait' | 'landscape'
      fileName: string
    }

type WorkerSuccess = {
  id: number
  ok: true
  buffer: ArrayBuffer
  mime: string
}

type WorkerFailure = {
  id: number
  ok: false
  error: string
}

async function pngToJpeg(pngBuffer: ArrayBuffer, quality: number): Promise<ArrayBuffer> {
  const blob = new Blob([pngBuffer], { type: 'image/png' })
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Contexte 2D indisponible dans le worker.')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
  return jpegBlob.arrayBuffer()
}

async function buildPdfFromPngPages(
  pages: ArrayBuffer[],
  paperWidthMm: number,
  paperHeightMm: number,
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create()
  const widthPt = paperWidthMm * MM_TO_PT
  const heightPt = paperHeightMm * MM_TO_PT
  for (const pageBuffer of pages) {
    const page = pdfDoc.addPage([widthPt, heightPt])
    const png = await pdfDoc.embedPng(pageBuffer)
    page.drawImage(png, {
      x: 0,
      y: 0,
      width: widthPt,
      height: heightPt,
    })
  }
  const bytes = await pdfDoc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

function isWorkerRequestPayload(data: unknown): data is WorkerRequest {
  if (!data || typeof data !== 'object') return false
  const record = data as Record<string, unknown>
  if (typeof record.id !== 'number' || typeof record.type !== 'string') return false
  if (record.type === 'png-dpi') {
    return isArrayBufferValue(record.png) && typeof record.dpi === 'number'
  }
  if (record.type === 'jpeg') {
    return isArrayBufferValue(record.png) && typeof record.quality === 'number'
  }
  if (record.type === 'pdf') {
    return (
      Array.isArray(record.pages) &&
      record.pages.every((page) => isArrayBufferValue(page)) &&
      typeof record.paperWidthMm === 'number' &&
      typeof record.paperHeightMm === 'number' &&
      (record.orientation === 'portrait' || record.orientation === 'landscape')
    )
  }
  return false
}

self.onmessage = (event: MessageEvent) => {
  if (event.origin !== self.location.origin) {
    if (event.origin !== '' && event.origin !== 'null') return
  }
  if (!isWorkerRequestPayload(event.data)) return

  void (async () => {
    const message = event.data
    try {
      if (message.type === 'png-dpi') {
        const withDpi = injectDpiInPngBytes(new Uint8Array(message.png), message.dpi)
        const response: WorkerSuccess = {
          id: message.id,
          ok: true,
          buffer: withDpi.buffer,
          mime: 'image/png',
        }
        self.postMessage(response, { transfer: [withDpi.buffer] })
        return
      }
      if (message.type === 'jpeg') {
        const jpeg = await pngToJpeg(message.png, message.quality)
        const response: WorkerSuccess = {
          id: message.id,
          ok: true,
          buffer: jpeg,
          mime: 'image/jpeg',
        }
        self.postMessage(response, { transfer: [jpeg] })
        return
      }
      if (message.type === 'pdf') {
        const pdf = await buildPdfFromPngPages(
          message.pages,
          message.paperWidthMm,
          message.paperHeightMm,
        )
        const response: WorkerSuccess = {
          id: message.id,
          ok: true,
          buffer: pdf,
          mime: 'application/pdf',
        }
        self.postMessage(response, { transfer: [pdf] })
      }
    } catch (err) {
      const response: WorkerFailure = {
        id: message.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
      self.postMessage(response)
    }
  })()
}

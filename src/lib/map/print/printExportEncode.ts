import { isArrayBufferValue } from '@/lib/map/print/printExportTransfer'

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

let worker: Worker | null = null
let requestId = 0
const pending = new Map<
  number,
  { resolve: (buffer: ArrayBuffer) => void; reject: (err: Error) => void }
>()

function isWorkerResponsePayload(data: unknown): data is WorkerSuccess | WorkerFailure {
  if (!data || typeof data !== 'object') return false
  const record = data as Record<string, unknown>
  if (typeof record.id !== 'number') return false
  if (record.ok === true) return isArrayBufferValue(record.buffer)
  if (record.ok === false) return typeof record.error === 'string'
  return false
}

/** Réponses du worker dédié : origine same-origin (si présente) + forme du message. */
function isTrustedPrintExportWorkerMessage(
  event: MessageEvent,
): event is MessageEvent<WorkerSuccess | WorkerFailure> {
  if (typeof globalThis.location !== 'undefined') {
    const origin = event.origin
    if (origin && origin !== 'null' && origin !== globalThis.location.origin) {
      return false
    }
  }
  return isWorkerResponsePayload(event.data)
}

function getPrintExportWorker(): Worker {
  if (typeof Worker === 'undefined') {
    throw new Error('Web Workers indisponibles.')
  }
  if (!worker) {
    const instance = new Worker(new URL('./printExport.worker.ts', import.meta.url), {
      type: 'module',
    })
    instance.onmessage = (event: MessageEvent) => {
      if (!isTrustedPrintExportWorkerMessage(event)) return
      const data = event.data
      const handler = pending.get(data.id)
      if (!handler) return
      pending.delete(data.id)
      if (data.ok) handler.resolve(data.buffer)
      else handler.reject(new Error(data.error))
    }
    instance.onerror = () => {
      for (const [, handler] of pending) {
        handler.reject(new Error('Erreur worker export.'))
      }
      pending.clear()
    }
    worker = instance
  }
  return worker
}

const WORKER_TASK_TIMEOUT_MS = 300_000

function runWorkerTask(request: WorkerRequest): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const timer =
      typeof window !== 'undefined'
        ? window.setTimeout(() => {
            pending.delete(request.id)
            reject(new Error('Délai dépassé lors de l’encodage export.'))
          }, WORKER_TASK_TIMEOUT_MS)
        : undefined
    pending.set(request.id, {
      resolve: (buffer) => {
        if (timer !== undefined) window.clearTimeout(timer)
        resolve(buffer)
      },
      reject: (err) => {
        if (timer !== undefined) window.clearTimeout(timer)
        reject(err)
      },
    })
    const transferables: Transferable[] = []
    if ('png' in request && request.png) transferables.push(request.png)
    if ('pages' in request) transferables.push(...request.pages)
    getPrintExportWorker().postMessage(request, transferables)
  })
}

async function canvasToPngBuffer(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Encodage PNG impossible.')
  return blob.arrayBuffer()
}

export async function encodePrintPngWithDpi(canvas: HTMLCanvasElement, dpi: number): Promise<Blob> {
  const png = await canvasToPngBuffer(canvas)
  const id = ++requestId
  const buffer = await runWorkerTask({ id, type: 'png-dpi', png, dpi })
  return new Blob([buffer], { type: 'image/png' })
}

export async function encodePrintJpeg(canvas: HTMLCanvasElement, quality = 0.95): Promise<Blob> {
  const png = await canvasToPngBuffer(canvas)
  const id = ++requestId
  const buffer = await runWorkerTask({ id, type: 'jpeg', png, quality })
  return new Blob([buffer], { type: 'image/jpeg' })
}

export async function encodePrintPdf(options: {
  canvases: HTMLCanvasElement[]
  paperWidthMm: number
  paperHeightMm: number
  orientation: 'portrait' | 'landscape'
}): Promise<Blob> {
  const pages = await Promise.all(options.canvases.map((canvas) => canvasToPngBuffer(canvas)))
  const id = ++requestId
  const buffer = await runWorkerTask({
    id,
    type: 'pdf',
    pages,
    paperWidthMm: options.paperWidthMm,
    paperHeightMm: options.paperHeightMm,
    orientation: options.orientation,
    fileName: 'carte.pdf',
  })
  return new Blob([buffer], { type: 'application/pdf' })
}

export function terminatePrintExportWorker(): void {
  worker?.terminate()
  worker = null
  pending.clear()
}

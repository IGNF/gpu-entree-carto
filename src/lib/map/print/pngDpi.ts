function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function buildPngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type)
  const length = data.length
  const crcInput = new Uint8Array(4 + length)
  crcInput.set(typeBytes)
  crcInput.set(data, 4)
  const crc = crc32(crcInput)
  const chunk = new Uint8Array(4 + 4 + length + 4)
  const dv = new DataView(chunk.buffer)
  dv.setUint32(0, length, false)
  chunk.set(typeBytes, 4)
  chunk.set(data, 8)
  dv.setUint32(8 + length, crc, false)
  return chunk
}

export function injectDpiInPngBytes(bytes: Uint8Array, dpi: number): Uint8Array {
  const ppm = Math.round(dpi / 0.0254)
  const phys = new Uint8Array(9)
  const view = new DataView(phys.buffer)
  view.setUint32(0, ppm, false)
  view.setUint32(4, ppm, false)
  view.setUint8(8, 1)
  const chunk = buildPngChunk('pHYs', phys)
  const result = new Uint8Array(bytes.length + chunk.length)
  result.set(bytes.slice(0, 33))
  result.set(chunk, 33)
  result.set(bytes.slice(33), 33 + chunk.length)
  return result
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) throw new Error('Data URL PNG invalide.')
  const meta = dataUrl.slice(0, comma)
  const payload = dataUrl.slice(comma + 1)
  if (meta.includes(';base64')) {
    const binary = atob(payload)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
  const decoded = decodeURIComponent(payload)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i)
  return bytes
}

/** Repli thread principal (sans fetch sur data:, bloqué par certaines CSP embed). */
export function injectDpiInPng(dataUrl: string, dpi: number): string {
  const withDpi = injectDpiInPngBytes(dataUrlToUint8Array(dataUrl), dpi)
  return URL.createObjectURL(new Blob([withDpi], { type: 'image/png' }))
}

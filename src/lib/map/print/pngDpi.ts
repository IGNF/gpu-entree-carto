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

export async function injectDpiInPng(dataUrl: string, dpi: number): Promise<string> {
  const ppm = Math.round(dpi / 0.0254)
  const response = await fetch(dataUrl)
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
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
  return URL.createObjectURL(new Blob([result], { type: 'image/png' }))
}

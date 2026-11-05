import { describe, expect, it } from 'vitest'
import { isArrayBufferValue } from '@/lib/map/print/printExportTransfer'

describe('isArrayBufferValue', () => {
  it('accepte un ArrayBuffer local', () => {
    expect(isArrayBufferValue(new ArrayBuffer(8))).toBe(true)
  })

  it('accepte la forme [object ArrayBuffer] (postMessage worker)', () => {
    const buffer = new ArrayBuffer(4)
    const tagged = Object.create(ArrayBuffer.prototype)
    Object.defineProperty(tagged, Symbol.toStringTag, { value: 'ArrayBuffer' })
    Object.defineProperty(tagged, 'byteLength', { value: buffer.byteLength })
    expect(isArrayBufferValue(tagged)).toBe(true)
  })
})

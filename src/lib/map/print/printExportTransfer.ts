/** ArrayBuffer reçu par postMessage (instanceof peut échouer entre worker et fenêtre). */
export function isArrayBufferValue(value: unknown): value is ArrayBuffer {
  if (value instanceof ArrayBuffer) return true
  return Object.prototype.toString.call(value) === '[object ArrayBuffer]'
}

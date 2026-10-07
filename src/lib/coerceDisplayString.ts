/** Affichage / concat : évite `String(unknown)` sur des objets (no-base-to-string). */
export function coerceDisplayString(value: unknown, fallback = ''): string {
  if (value == null) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return fallback
}

export function formDataString(fd: FormData, key: string, fallback = ''): string {
  return coerceDisplayString(fd.get(key), fallback)
}

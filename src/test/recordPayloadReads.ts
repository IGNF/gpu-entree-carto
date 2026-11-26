/**
 * Enregistre les chemins lus dans une réponse JSON (tests du « garde-fou » des champs utilisés par la fiche).
 * Index de tableau → `*` ; clés listées dans `dynamicParents` (partitions, identifiants) → `*`.
 * Une copie par décomposition (`{ ...data }`) n’est pas comptée comme lecture.
 */
export function recordPayloadReads<T extends object>(
  value: T,
  dynamicParents: ReadonlySet<string>,
): { proxy: T; reads: Set<string> } {
  const reads = new Set<string>()

  const wrap = (target: unknown, path: string[]): unknown => {
    if (!target || typeof target !== 'object') return target
    let spreadKeys: Set<PropertyKey> | null = null
    return new Proxy(target, {
      ownKeys(obj) {
        const keys = Reflect.ownKeys(obj)
        spreadKeys = new Set(keys)
        return keys
      },
      get(obj, key, receiver) {
        const val = Reflect.get(obj, key, receiver)
        if (typeof key === 'symbol') return val
        if (spreadKeys?.has(key)) {
          spreadKeys.delete(key)
          if (!spreadKeys.size) spreadKeys = null
          return wrap(val, [...path, segment(obj, key, path)])
        }
        if (!(key in obj) || typeof val === 'function') return val
        const next = [...path, segment(obj, key, path)]
        reads.add(next.join('.'))
        return wrap(val, next)
      },
    })
  }

  const segment = (obj: object, key: string, path: string[]): string => {
    if (Array.isArray(obj) && /^\d+$/.test(key)) return '*'
    const parent = path[path.length - 1]
    return parent !== undefined && dynamicParents.has(path.join('.')) ? '*' : key
  }

  return { proxy: wrap(value, []) as T, reads }
}

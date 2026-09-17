/**
 * Ordre panneau Couches de données — clés de tri persistantes (entrées décochées conservées).
 */

export const STACK_SORT_KEY_STEP = 1000

export type StackSortKeyById = Record<string, number>

export function ensureStackSortKeys(
  sortKeyById: StackSortKeyById,
  catalogStackOrderBottomToTop: string[],
): StackSortKeyById {
  const next = { ...sortKeyById }
  catalogStackOrderBottomToTop.forEach((id, index) => {
    if (next[id] === undefined) {
      next[id] = (index + 1) * STACK_SORT_KEY_STEP
    }
  })
  return next
}

export function sortIdsByStackSortKey(sortKeyById: StackSortKeyById, ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const ka = sortKeyById[a] ?? Number.MAX_SAFE_INTEGER
    const kb = sortKeyById[b] ?? Number.MAX_SAFE_INTEGER
    if (ka !== kb) return ka - kb
    return a.localeCompare(b)
  })
}

/**
 * Remplace le bloc « actif » dans l’ordre global (clé croissante) par `activeTopToBottom`,
 * sans déplacer les entrées décochées.
 */
export function buildFullOrderAfterActiveReorder(
  sortKeyById: StackSortKeyById,
  activeTopToBottom: string[],
): string[] {
  const activeSet = new Set(activeTopToBottom)
  const sorted = Object.keys(sortKeyById).sort((a, b) => sortKeyById[a]! - sortKeyById[b]!)
  const out: string[] = []
  let injectedActive = false
  for (const id of sorted) {
    if (activeSet.has(id)) {
      if (!injectedActive) {
        out.push(...activeTopToBottom)
        injectedActive = true
      }
      continue
    }
    out.push(id)
  }
  if (!injectedActive) out.push(...activeTopToBottom)
  return out
}

export function assignStackSortKeysFromFullOrder(
  sortKeyById: StackSortKeyById,
  fullOrder: string[],
): StackSortKeyById {
  const next = { ...sortKeyById }
  fullOrder.forEach((id, index) => {
    next[id] = (index + 1) * STACK_SORT_KEY_STEP
  })
  return next
}

/** @param toInsertBefore index d’insertion dans la liste active (0 = tout en haut). */
export function reorderActiveStackSortKeys(
  sortKeyById: StackSortKeyById,
  activeTopToBottom: string[],
  fromDisplayIndex: number,
  toInsertBefore: number,
): StackSortKeyById {
  const order = [...activeTopToBottom]
  if (fromDisplayIndex < 0 || fromDisplayIndex >= order.length) return sortKeyById
  if (toInsertBefore < 0 || toInsertBefore > order.length) return sortKeyById
  if (fromDisplayIndex === toInsertBefore || fromDisplayIndex + 1 === toInsertBefore) {
    return sortKeyById
  }
  const [item] = order.splice(fromDisplayIndex, 1)
  let insertAt = toInsertBefore
  if (fromDisplayIndex < toInsertBefore) insertAt -= 1
  order.splice(insertAt, 0, item!)

  const fullOrder = buildFullOrderAfterActiveReorder(sortKeyById, order)
  return assignStackSortKeysFromFullOrder(sortKeyById, fullOrder)
}

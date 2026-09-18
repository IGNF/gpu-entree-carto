import { describe, expect, it } from 'vitest'
import {
  activeTopToBottomReplacingAggregateWithChildren,
  buildFullOrderAfterActiveReorder,
  ensureStackSortKeys,
  reassignSortKeysAfterAggregateSplit,
  reorderActiveStackSortKeys,
  STACK_SORT_KEY_STEP,
} from '@/lib/layerConfig/catalogStackDisplayOrder'

const catalogOrder = ['vue', 'zonages', 'presc', 'perim']

describe('ensureStackSortKeys', () => {
  it('assigne des clés catalogue sans écraser l’existant', () => {
    const keys = ensureStackSortKeys({ vue: 500 }, catalogOrder)
    expect(keys.vue).toBe(500)
    expect(keys.zonages).toBe(2 * STACK_SORT_KEY_STEP)
  })
})

describe('buildFullOrderAfterActiveReorder', () => {
  it('garde les entrées décochées avant le bloc actif réordonné', () => {
    const keys = {
      vue: 1000,
      zonages: 2000,
      presc: 3000,
      perim: 4000,
    }
    const full = buildFullOrderAfterActiveReorder(keys, ['presc', 'perim', 'zonages'])
    expect(full).toEqual(['vue', 'presc', 'perim', 'zonages'])
  })
})

describe('aggregate split sort keys', () => {
  it('remplace l’agrégat par les enfants contigus (ordre catalogue)', () => {
    expect(
      activeTopToBottomReplacingAggregateWithChildren(
        ['vue', 'agg', 'other'],
        'agg',
        ['c1', 'c2', 'c3'],
      ),
    ).toEqual(['vue', 'c1', 'c2', 'c3', 'other'])

    let keys = ensureStackSortKeys({}, ['vue', 'agg', 'other'])
    keys = reassignSortKeysAfterAggregateSplit(keys, ['vue', 'agg', 'other'], 'agg', [
      'c1',
      'c2',
      'c3',
    ])
    expect(keys.c1).toBeLessThan(keys.c2!)
    expect(keys.c2).toBeLessThan(keys.c3!)
    expect(keys.c3).toBeLessThan(keys.other!)
    expect(keys.vue).toBeLessThan(keys.c1!)
  })
})

describe('reorderActiveStackSortKeys', () => {
  it('recocher vue reste au-dessus de presc après drag de zonages', () => {
    let keys = ensureStackSortKeys({}, catalogOrder)
    keys = reorderActiveStackSortKeys(keys, ['zonages', 'presc', 'perim'], 0, 3)
    expect(keys.vue).toBe(STACK_SORT_KEY_STEP)
    expect(keys.vue).toBeLessThan(keys.presc!)
    expect(keys.presc).toBeLessThan(keys.zonages!)
  })
})

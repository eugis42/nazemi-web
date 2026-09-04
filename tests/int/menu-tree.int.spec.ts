import { describe, expect, it } from 'vitest'

import {
  applyMenuDrop,
  flattenMenuItems,
  getDropIndicatorSlot,
  nestMenuItems,
  normalizeMenuDepths,
  type FlatMenuItem,
} from '@/lib/menu-tree'

type Item = { label: string; id?: string }

describe('menu-tree', () => {
  it('flattens nested children to depth', () => {
    const flat = flattenMenuItems<Item>([
      { label: 'A', children: [{ label: 'a1' }, { label: 'a2' }] },
      { label: 'B' },
    ])
    expect(flat.map((i) => [i.label, i.depth])).toEqual([
      ['A', 0],
      ['a1', 1],
      ['a2', 1],
      ['B', 0],
    ])
  })

  it('nests flat depth back to children', () => {
    const nested = nestMenuItems<Item>([
      { label: 'A', depth: 0 },
      { label: 'a1', depth: 1 },
      { label: 'B', depth: 0 },
    ])
    expect(nested).toEqual([
      { label: 'A', children: [{ label: 'a1' }] },
      { label: 'B' },
    ])
  })

  it('promotes orphan depth-1 to root', () => {
    expect(normalizeMenuDepths<Item>([{ label: 'x', depth: 1 }])).toEqual([
      { label: 'x', depth: 0 },
    ])
  })

  it('moves L2 under another L1 via drop', () => {
    const items: FlatMenuItem<Item>[] = [
      { label: 'A', id: 'A', depth: 0 },
      { label: 'a1', id: 'a1', depth: 1 },
      { label: 'B', id: 'B', depth: 0 },
    ]
    const next = applyMenuDrop(items, 'a1', 'B', 1)
    expect(next.map((i) => [i.label, i.depth])).toEqual([
      ['A', 0],
      ['B', 0],
      ['a1', 1],
    ])
  })

  it('outdents L2 to L1', () => {
    const items: FlatMenuItem<Item>[] = [
      { label: 'A', id: 'A', depth: 0 },
      { label: 'a1', id: 'a1', depth: 1 },
    ]
    const next = applyMenuDrop(items, 'a1', 'a1', 0)
    expect(next.map((i) => [i.label, i.depth])).toEqual([
      ['A', 0],
      ['a1', 0],
    ])
  })

  it('drop indicator: moving down places line after over', () => {
    expect(getDropIndicatorSlot(['A', 'B', 'C'], 'A', 'B', 0)).toEqual({
      beforeIndex: 2,
      depth: 0,
    })
  })

  it('drop indicator: moving up places line before over', () => {
    expect(getDropIndicatorSlot(['A', 'B', 'C'], 'C', 'A', 1)).toEqual({
      beforeIndex: 0,
      depth: 1,
    })
  })
})

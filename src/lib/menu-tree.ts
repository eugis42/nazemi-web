/** Flat admin storage (depth 0|1) ↔ nested FE menu. Max depth = 1. */

export type MenuDepth = 0 | 1

export type FlatMenuItem<T extends object = object> = T & {
  depth?: MenuDepth | number | null
  id?: string | null
}

export type NestedMenuItem<T extends object = object> = T & {
  children?: NestedMenuItem<T>[] | null
}

type Flattened<T extends object> = FlatMenuItem<T> & {
  depth: MenuDepth
  index: number
  parentId: string | null
}

const INDENT = 24
const MAX_DEPTH: MenuDepth = 1

function asDepth(value: unknown): MenuDepth {
  return value === 1 || value === '1' ? 1 : 0
}

function rowId<T extends object>(item: FlatMenuItem<T>, fallback: string): string {
  return typeof item.id === 'string' && item.id ? item.id : fallback
}

/** Nested → flat (depth). Children become depth-1 rows under parent. */
export function flattenMenuItems<T extends object>(
  items: NestedMenuItem<T>[] | null | undefined,
): FlatMenuItem<T>[] {
  if (!items?.length) return []
  const out: FlatMenuItem<T>[] = []
  for (const item of items) {
    const { children, ...rest } = item
    out.push({ ...(rest as T), depth: 0 })
    for (const child of children || []) {
      const { children: _ignored, ...childRest } = child
      out.push({ ...(childRest as T), depth: 1 })
    }
  }
  return out
}

/** Flat (depth) → nested children. Invalid depth-1 without parent is promoted to depth 0. */
export function nestMenuItems<T extends object>(
  items: FlatMenuItem<T>[] | null | undefined,
): NestedMenuItem<T>[] {
  if (!items?.length) return []
  const out: NestedMenuItem<T>[] = []
  for (const item of items) {
    const depth = asDepth(item.depth)
    const { depth: _d, ...rest } = item
    if (depth === 1 && out.length) {
      const parent = out[out.length - 1]
      parent.children = parent.children || []
      parent.children.push({ ...(rest as T) })
      continue
    }
    out.push({ ...(rest as T), children: [] })
  }
  for (const item of out) {
    if (!item.children?.length) delete item.children
  }
  return out
}

export function flattenForDrag<T extends object>(
  items: FlatMenuItem<T>[],
): Flattened<T>[] {
  const out: Flattened<T>[] = []
  let lastParentId: string | null = null
  items.forEach((item, index) => {
    const depth = asDepth(item.depth)
    const id = rowId(item, `row-${index}`)
    if (depth === 0) lastParentId = id
    out.push({
      ...item,
      depth,
      id,
      index,
      parentId: depth === 0 ? null : lastParentId,
    })
  })
  return out
}

function getDragDepth(offset: number, indentationWidth = INDENT): number {
  return Math.round(offset / indentationWidth)
}

/** Project drop depth/parent while dragging (Notion-style horizontal indent). */
export function getMenuProjection<T extends object>(
  items: Flattened<T>[],
  activeId: string,
  overId: string,
  dragOffsetX: number,
  indentationWidth = INDENT,
): { depth: MenuDepth; maxDepth: MenuDepth; minDepth: MenuDepth; parentId: string | null } {
  const overIndex = items.findIndex((item) => item.id === overId)
  const activeIndex = items.findIndex((item) => item.id === activeId)
  const active = items[activeIndex]
  const newItems = arrayMove(items, activeIndex, overIndex)
  const previous = newItems[overIndex - 1]
  const next = newItems[overIndex + 1]
  const dragDepth = getDragDepth(dragOffsetX, indentationWidth)
  const projected = (active?.depth ?? 0) + dragDepth

  const maxDepth: MenuDepth = !previous ? 0 : previous.depth === 0 ? 1 : 1
  const minDepth: MenuDepth = next?.depth === 1 ? 1 : 0
  let depth = clampDepth(projected, minDepth, maxDepth)

  // Dropping as child of previous L1 / keeping under previous when depth 1
  let parentId: string | null = null
  if (depth === 1 && previous) {
    parentId = previous.depth === 0 ? previous.id! : previous.parentId
  }

  return { depth, maxDepth, minDepth, parentId }
}

/**
 * Where to draw the drop line in the current list (before row index, or at end).
 * Matches applyMenuDrop insert semantics for a single-row move preview.
 */
export function getDropIndicatorSlot(
  itemIds: string[],
  activeId: string,
  overId: string,
  depth: MenuDepth,
): { beforeIndex: number; depth: MenuDepth } | null {
  const activeIndex = itemIds.indexOf(activeId)
  const overIndex = itemIds.indexOf(overId)
  if (activeIndex < 0 || overIndex < 0) return null

  // Same slot — depth-only change: line sits on the active row
  if (activeIndex === overIndex) {
    return { beforeIndex: activeIndex, depth }
  }

  // Moving down → gap after over; moving up → gap before over
  const beforeIndex = activeIndex < overIndex ? overIndex + 1 : overIndex
  return { beforeIndex, depth }
}

function clampDepth(value: number, min: MenuDepth, max: MenuDepth): MenuDepth {
  const n = Math.max(min, Math.min(max, Math.round(value)))
  return n >= 1 ? 1 : 0
}

export function arrayMove<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list.slice()
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** Indices of active row + its immediate depth-1 children (move as block). */
export function getSubtreeIndexRange<T extends object>(
  items: Flattened<T>[],
  activeIndex: number,
): { start: number; end: number } {
  const active = items[activeIndex]
  if (!active || active.depth !== 0) return { start: activeIndex, end: activeIndex }
  let end = activeIndex
  for (let i = activeIndex + 1; i < items.length; i++) {
    if (items[i].depth === 0) break
    end = i
  }
  return { start: activeIndex, end }
}

/**
 * Apply drop: move active subtree to over position with projected depth.
 * Returns new flat list (depth set; strips drag-only fields).
 */
export function applyMenuDrop<T extends object>(
  items: FlatMenuItem<T>[],
  activeId: string,
  overId: string,
  projectedDepth: MenuDepth,
): FlatMenuItem<T>[] {
  const flat = flattenForDrag(items)
  const activeIndex = flat.findIndex((item) => item.id === activeId)
  const overIndex = flat.findIndex((item) => item.id === overId)
  if (activeIndex < 0 || overIndex < 0) return items

  const { start, end } = getSubtreeIndexRange(flat, activeIndex)
  const moving = flat.slice(start, end + 1)
  const remaining = flat.filter((_, i) => i < start || i > end)

  // Target index in remaining (over may be inside moving block)
  let insertAt = remaining.findIndex((item) => item.id === overId)
  if (insertAt < 0) insertAt = remaining.length
  else if (activeIndex < overIndex) insertAt += 1

  const [head, ...tail] = moving
  const nextHead: Flattened<T> = {
    ...head,
    depth: projectedDepth,
    parentId: projectedDepth === 0 ? null : head.parentId,
  }
  // Children stay depth 1 under a moved L1; if head becomes L2, promote former children to L1 after it
  const nextTail: Flattened<T>[] =
    projectedDepth === 0
      ? tail.map((item) => ({ ...item, depth: 1 as MenuDepth }))
      : tail.map((item) => ({ ...item, depth: 0 as MenuDepth, parentId: null }))

  const merged = [...remaining.slice(0, insertAt), nextHead, ...nextTail, ...remaining.slice(insertAt)]

  return normalizeMenuDepths(
    merged.map(({ depth, index: _i, parentId: _p, ...rest }) => ({
      ...(rest as T),
      depth,
      id: rest.id,
    })),
  )
}

/** Ensure no orphan depth-1 rows; clamp to 0|1. */
export function normalizeMenuDepths<T extends object>(
  items: FlatMenuItem<T>[],
): FlatMenuItem<T>[] {
  let seenRoot = false
  return items.map((item) => {
    let depth = asDepth(item.depth)
    if (depth === 1 && !seenRoot) depth = 0
    if (depth === 0) seenRoot = true
    return { ...item, depth }
  })
}

export const MENU_TREE_INDENT_PX = INDENT
export const MENU_TREE_MAX_DEPTH = MAX_DEPTH

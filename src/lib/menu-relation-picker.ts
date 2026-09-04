import type { CollectionBeforeOperationHook, Where } from 'payload'

import { withDiacriticInsensitiveSearch } from '@/lib/diacritic-admin-search'

/** Upcoming events — same rule as homepage listing (`startDate >= now`). */
export function upcomingEventsWhere(now = new Date().toISOString()): Where {
  return {
    startDate: { greater_than_equal: now },
  }
}

export function whereHasLike(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false
  if (Array.isArray(node)) return node.some(whereHasLike)
  const obj = node as Record<string, unknown>
  if ('like' in obj || 'contains' in obj) return true
  return Object.values(obj).some(whereHasLike)
}

/**
 * Payload relationship select: draft + depth 0 + limit 10 + title-only select.
 * Distinguish from collection list view so we can tweak default options.
 */
export function isAdminRelationPickerFind(args: {
  depth?: unknown
  draft?: unknown
  limit?: unknown
  select?: unknown
}): boolean {
  if (args.draft !== true) return false
  if (args.depth !== 0 && args.depth !== '0') return false
  const limit = typeof args.limit === 'string' ? Number(args.limit) : args.limit
  if (limit !== 10) return false
  const select = args.select
  if (!select || typeof select !== 'object' || Array.isArray(select)) return false
  const keys = Object.keys(select as object)
  return keys.length > 0 && keys.every((key) => key === 'title' || key === 'id')
}

function mergeAnd(base: Where | undefined, extra: Where): Where {
  if (!base || Object.keys(base).length === 0) return extra
  return { and: [base, extra] }
}

type FindArgs = {
  depth?: unknown
  draft?: unknown
  limit?: unknown
  page?: number | string
  select?: unknown
  sort?: unknown
  where?: Where
}

function asFindArgs(args: unknown): FindArgs | null {
  if (!args || typeof args !== 'object') return null
  return args as FindArgs
}

/** @deprecated use withDiacriticInsensitiveSearch — kept for older tests */
export function withDiacriticInsensitiveTitleSearch(
  where: Where | undefined,
  mode: 'slug' | 'prehledy' = 'slug',
): Where | undefined {
  return withDiacriticInsensitiveSearch(where, {
    hasSlug: mode === 'slug',
    hasSearchFold: mode === 'slug',
    prehledy: mode === 'prehledy',
  })
}

/** Kalendar: default list = upcoming only; typing search → all events. */
export const kalendarMenuPickerBeforeOperation: CollectionBeforeOperationHook = ({
  args,
  operation,
}) => {
  const find = asFindArgs(args)
  if (operation !== 'read' || !find || !isAdminRelationPickerFind(find)) return args
  if (whereHasLike(find.where)) {
    find.sort = '-startDate'
    return args
  }
  find.where = mergeAnd(find.where, upcomingEventsWhere())
  find.sort = 'startDate'
  return args
}

/** Aktuality: default list = newest first (10/page); typing search → all news. */
export const aktualityMenuPickerBeforeOperation: CollectionBeforeOperationHook = ({
  args,
  operation,
}) => {
  const find = asFindArgs(args)
  if (operation !== 'read' || !find || !isAdminRelationPickerFind(find)) return args
  find.sort = '-publishedAt'
  return args
}

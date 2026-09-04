import type {
  CollectionBeforeChangeHook,
  CollectionBeforeOperationHook,
  CollectionConfig,
  Field,
  Plugin,
  Where,
} from 'payload'

import {
  COLLECTION_HOME_KEYS,
  collectionHomeTitle,
  type CollectionHomeKey,
} from '@/lib/collection-homes'
import { foldDiacritics } from '@/lib/diacritics'
import { buildSearchFold, searchFoldField } from '@/lib/search-fold'

/** Text fields that should also match via searchFold / slug. */
const TEXT_SEARCH_FIELDS = new Set([
  'title',
  'name',
  'authorName',
  'alt',
  'role',
  'label',
  'excerpt',
  'description',
  'email',
])

function fieldsIncludeName(fields: Field[] | undefined, name: string): boolean {
  if (!fields) return false
  for (const field of fields) {
    if ('name' in field && field.name === name) return true
    if ('fields' in field && Array.isArray(field.fields) && fieldsIncludeName(field.fields, name)) {
      return true
    }
    if ('tabs' in field && Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        if ('fields' in tab && fieldsIncludeName(tab.fields, name)) return true
      }
    }
    if (
      'blocks' in field &&
      Array.isArray(field.blocks) &&
      field.blocks.some((block) => fieldsIncludeName(block.fields, name))
    ) {
      return true
    }
  }
  return false
}

export function collectionHasSlugField(collection: Pick<CollectionConfig, 'fields'>): boolean {
  return fieldsIncludeName(collection.fields, 'slug')
}

export function collectionHasSearchFoldField(
  collection: Pick<CollectionConfig, 'fields'>,
): boolean {
  return fieldsIncludeName(collection.fields, 'searchFold')
}

function extractSearchTerm(ops: Record<string, unknown>): string | null {
  const raw = ops.like ?? ops.contains
  return typeof raw === 'string' && raw.trim() ? raw : null
}

export function foldedSlugTerm(term: string): string {
  return foldDiacritics(term).replace(/\s+/g, '%')
}

/** Match přehled rows by enum key / folded title — enum columns reject ILIKE. */
export function matchingPrehledyKeys(term: string): CollectionHomeKey[] {
  const folded = foldDiacritics(term)
  if (!folded) return []
  return COLLECTION_HOME_KEYS.filter(
    (key) => key.includes(folded) || foldDiacritics(collectionHomeTitle(key)).includes(folded),
  )
}

export type DiacriticSearchOptions = {
  hasSlug?: boolean
  hasSearchFold?: boolean
  /** Enable collectionKey `in` fallback (prehledy only). */
  prehledy?: boolean
}

/**
 * Expand text `like`/`contains` so ASCII queries match diacritic values.
 * Prefer `searchFold` (folded title/excerpt/…); also fold `slug` likes.
 */
export function withDiacriticInsensitiveSearch(
  where: Where | undefined,
  options: DiacriticSearchOptions = {},
): Where | undefined {
  if (!where) return where
  return rewriteWhereNode(where, {
    hasSlug: options.hasSlug !== false,
    hasSearchFold: Boolean(options.hasSearchFold),
    prehledy: Boolean(options.prehledy),
  }) as Where
}

function rewriteWhereNode(
  node: unknown,
  options: { hasSlug: boolean; hasSearchFold: boolean; prehledy: boolean },
): unknown {
  if (!node || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map((item) => rewriteWhereNode(item, options))

  const obj = node as Record<string, unknown>

  if ('and' in obj || 'or' in obj) {
    const next: Record<string, unknown> = { ...obj }
    if (Array.isArray(obj.and)) next.and = obj.and.map((item) => rewriteWhereNode(item, options))
    if (Array.isArray(obj.or)) next.or = obj.or.map((item) => rewriteWhereNode(item, options))
    return next
  }

  const keys = Object.keys(obj)
  if (keys.length !== 1) return obj

  const field = keys[0]
  const rawOps = obj[field]
  if (!rawOps || typeof rawOps !== 'object' || Array.isArray(rawOps)) return obj
  const ops = rawOps as Record<string, unknown>
  const term = extractSearchTerm(ops)
  if (!term) return obj

  const folded = foldedSlugTerm(term)
  const alts: Where[] = [{ [field]: ops }]

  if (field === 'searchFold') {
    const op = 'like' in ops ? 'like' : 'contains'
    return { searchFold: { [op]: folded } }
  }

  if (field === 'slug') {
    const op = 'like' in ops ? 'like' : 'contains'
    return { slug: { [op]: folded } }
  }

  if (field === 'collectionKey' && options.prehledy) {
    const keysMatch = matchingPrehledyKeys(term)
    if (!keysMatch.length) return obj
    return { collectionKey: { in: keysMatch } }
  }

  if (options.hasSearchFold && (TEXT_SEARCH_FIELDS.has(field) || field === 'title')) {
    alts.push({ searchFold: { like: folded } })
  } else if (options.hasSlug && TEXT_SEARCH_FIELDS.has(field)) {
    alts.push({ slug: { like: folded } })
  }

  if (options.prehledy && field === 'title') {
    const keysMatch = matchingPrehledyKeys(term)
    if (keysMatch.length) alts.push({ collectionKey: { in: keysMatch } })
  }

  if (alts.length === 1) return obj
  return { or: alts }
}

type FindArgs = { where?: Where }

function asFindArgs(args: unknown): FindArgs | null {
  if (!args || typeof args !== 'object') return null
  return args as FindArgs
}

export function diacriticSearchBeforeOperation(options: {
  hasSlug: boolean
  hasSearchFold: boolean
  prehledy?: boolean
}): CollectionBeforeOperationHook {
  return ({ args, operation }) => {
    if (operation !== 'read') return args
    const find = asFindArgs(args)
    if (!find?.where) return args
    find.where = withDiacriticInsensitiveSearch(find.where, options)
    return args
  }
}

export const populateSearchFold: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const merged = {
    ...((originalDoc || {}) as Record<string, unknown>),
    ...((data || {}) as Record<string, unknown>),
  }
  return {
    ...(data || {}),
    searchFold: buildSearchFold(merged),
  }
}

function withSearchFoldOnListSearchable(collection: CollectionConfig): CollectionConfig {
  const admin = collection.admin || {}
  const existing = admin.listSearchableFields
  const base =
    existing && existing.length > 0
      ? [...existing]
      : [typeof admin.useAsTitle === 'string' ? admin.useAsTitle : 'title']
  if (!base.includes('searchFold')) base.push('searchFold')
  return {
    ...collection,
    admin: {
      ...admin,
      listSearchableFields: base,
    },
  }
}

function appendHook<T>(existing: T | T[] | undefined, hook: T): T[] {
  if (!existing) return [hook]
  return Array.isArray(existing) ? [...existing, hook] : [existing, hook]
}

/** Collections that get a folded search index (skip auth/system noise). */
const SKIP_SEARCH_FOLD = new Set([
  'users',
  'payload-preferences',
  'payload-migrations',
  'payload-locked-documents',
  'payload-folders',
  'payload-jobs',
  'search',
])

/** Admin list search + filters + relationship pickers: diacritic-insensitive. */
export const diacriticAdminSearchPlugin =
  (): Plugin =>
  (config) => ({
    ...config,
    collections: (config.collections || []).map((collection) => {
      const prehledy = collection.slug === 'prehledy'
      const skipFold = SKIP_SEARCH_FOLD.has(collection.slug)
      let next = collection

      if (!skipFold && !collectionHasSearchFoldField(next)) {
        next = {
          ...next,
          fields: [...(next.fields || []), searchFoldField()],
          hooks: {
            ...next.hooks,
            beforeChange: appendHook(next.hooks?.beforeChange, populateSearchFold),
          },
        }
        next = withSearchFoldOnListSearchable(next)
      }

      const hasSlug = collectionHasSlugField(next)
      const hasSearchFold = collectionHasSearchFoldField(next)
      if (!hasSlug && !hasSearchFold && !prehledy) return next

      return {
        ...next,
        hooks: {
          ...next.hooks,
          beforeOperation: appendHook(
            next.hooks?.beforeOperation,
            diacriticSearchBeforeOperation({ hasSlug, hasSearchFold, prehledy }),
          ),
        },
      }
    }),
  })

import type { TextField } from 'payload'

import { foldDiacritics } from '@/lib/diacritics'

/** Hidden blob of folded searchable text — admin list/filter/picker. */
export const searchFoldField = (): TextField => ({
  name: 'searchFold',
  type: 'text',
  index: true,
  admin: {
    hidden: true,
    readOnly: true,
  },
})

const SEARCH_FOLD_SOURCE_KEYS = [
  'title',
  'name',
  'slug',
  'excerpt',
  'description',
  'authorName',
  'role',
  'alt',
  'label',
  'email',
  'collectionKey',
] as const

/** Build folded search index from common text fields on a doc. */
export function buildSearchFold(data: Record<string, unknown> | null | undefined): string {
  if (!data) return ''
  const parts: string[] = []
  for (const key of SEARCH_FOLD_SOURCE_KEYS) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) parts.push(value)
  }
  return foldDiacritics(parts.join(' ')).replace(/\s+/g, ' ').trim()
}

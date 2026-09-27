import type { CollectionSlug } from 'payload'

/** Collections pickable as Lexical relationship embeds / internal links. */
export const RICH_TEXT_RELATION_COLLECTIONS = [
  'stranky',
  'kalendar',
  'aktuality',
  'projekty',
  'publikace',
  'lide',
  'workshopy',
] as const satisfies readonly CollectionSlug[]

export type RichTextRelationCollection = (typeof RICH_TEXT_RELATION_COLLECTIONS)[number]

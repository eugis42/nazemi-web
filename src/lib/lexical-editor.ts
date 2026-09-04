import {
  RelationshipFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import type { CollectionSlug } from 'payload'

/** Collections pickable as Lexical relationship embeds. */
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

/** Shared Lexical editor — relationship picker limited to content embeds. */
export const nazemiLexicalEditor = lexicalEditor({
  features: ({ defaultFeatures }) =>
    defaultFeatures.map((feature) =>
      feature.key === 'relationship'
        ? RelationshipFeature({
            enabledCollections: [...RICH_TEXT_RELATION_COLLECTIONS],
            maxDepth: 2,
          })
        : feature,
    ),
})

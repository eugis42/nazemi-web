import {
  HeadingFeature,
  LinkFeature,
  RelationshipFeature,
  UploadFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { RICH_TEXT_RELATION_COLLECTIONS } from '@/lib/lexical-collections'

/**
 * Slim Lexical editor for nested rich text inside Lexical blocks
 * (e.g. expanding-paragraph body). No BlocksFeature / FixedToolbar —
 * avoids nested expand-in-expand and keeps the drawer light.
 */
export const nazemiNestedLexicalEditor = lexicalEditor({
  features: ({ defaultFeatures }) =>
    defaultFeatures.map((feature) => {
      if (feature.key === 'heading') {
        return HeadingFeature({
          enabledHeadingSizes: ['h2', 'h3', 'h4', 'h5', 'h6'],
        })
      }
      if (feature.key === 'link') {
        return LinkFeature({
          enabledCollections: [...RICH_TEXT_RELATION_COLLECTIONS],
          maxDepth: 1,
        })
      }
      if (feature.key === 'relationship') {
        return RelationshipFeature({
          enabledCollections: [...RICH_TEXT_RELATION_COLLECTIONS],
          maxDepth: 1,
        })
      }
      if (feature.key === 'upload') {
        return UploadFeature({
          collections: {
            media: {
              fields: [],
            },
          },
        })
      }
      return feature
    }),
})

import {
  HeadingFeature,
  LinkFeature,
  RelationshipFeature,
  TextStateFeature,
  UploadFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { SiteTextColorVarsFeature } from '@/features/SiteTextColorVarsFeature'
import { RICH_TEXT_RELATION_COLLECTIONS } from '@/lib/lexical-collections'
import { textColorState } from '@/lib/lexical-text-color'

/**
 * Slim Lexical editor for nested rich text inside Lexical blocks
 * (e.g. expanding-paragraph body). No BlocksFeature / FixedToolbar —
 * avoids nested expand-in-expand and keeps the drawer light.
 * Text colour matches root editor (same TextStateFeature tokens).
 */
export const nazemiNestedLexicalEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures.map((feature) => {
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
    TextStateFeature({
      state: {
        color: textColorState.color,
      },
    }),
    SiteTextColorVarsFeature(),
  ],
})

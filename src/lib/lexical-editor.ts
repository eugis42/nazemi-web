import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  LinkFeature,
  RelationshipFeature,
  TextStateFeature,
  UploadFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { SiteTextColorVarsFeature } from '@/features/SiteTextColorVarsFeature'
import {
  RICH_TEXT_RELATION_COLLECTIONS,
  type RichTextRelationCollection,
} from '@/lib/lexical-collections'
import { nazemiLexicalEmbedBlocks } from '@/lib/lexical-embed-blocks'
import { textColorState } from '@/lib/lexical-text-color'

export { RICH_TEXT_RELATION_COLLECTIONS, type RichTextRelationCollection }

const uploadWidthModeField = {
  name: 'widthMode',
  type: 'select' as const,
  label: 'Způsob šířky',
  defaultValue: 'auto',
  options: [
    { label: 'Celá šířka obsahu', value: 'auto' },
    { label: 'Pixely (px)', value: 'px' },
    { label: 'Procenta (%)', value: 'percent' },
  ],
  admin: {
    description:
      'Celá šířka = vyplní sloupec textu, ale nikdy není větší než originál. Pixely = pevná max. šířka na všech zařízeních (nikdy nepřeteče sloupec). Procenta = podíl šířky sloupce na tabletu/desktopu; na mobilu vždy na celou šířku.',
  },
}

const uploadMaxWidthPxField = {
  name: 'maxWidth',
  type: 'number' as const,
  label: 'Šířka (px)',
  min: 1,
  admin: {
    condition: (_: unknown, siblingData: { widthMode?: string } | undefined) =>
      siblingData?.widthMode === 'px',
    description: 'Např. 280 u loga. Na úzkém displeji se zmenší, aby se vešlo do sloupce.',
    step: 1,
  },
}

const uploadWidthPercentField = {
  name: 'widthPercent',
  type: 'number' as const,
  label: 'Šířka (%)',
  min: 1,
  max: 100,
  admin: {
    condition: (_: unknown, siblingData: { widthMode?: string } | undefined) =>
      siblingData?.widthMode === 'percent',
    description: 'Např. 50 = polovina sloupce na větších obrazovkách. Na mobilu vždy 100 %.',
    step: 1,
  },
}

/**
 * Shared Lexical editor (site-wide root + field editors that inherit it).
 * - h1 disabled (page headers own H1)
 * - LinkFeature: internal docs limited to content collections
 * - FixedToolbarFeature: persistent top toolbar
 * - TextStateFeature: text colour tokens from document site palette
 * - BlocksFeature: Galerie + Pás log + Rozbalovací odstavec + Lidé + Sloupce
 *
 * Payload toolbar groups (see payloadcms.com/docs/rich-text/custom-features):
 * - `add` (+): insertables only — upload / relationship / HR
 * - `text` (Aa / “Normální text”): paragraph, headings, lists, quote
 * - `blocks` (BlockIcon): Lexical embed blocks
 * Slash / gutter + = union of slashMenu items (all of the above).
 * Do not stuff headings/lists into `add` or embed blocks into `add`.
 */
export const nazemiLexicalEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures.map((feature) => {
      // Page headers already use h1 — keep rich text at h2+ to avoid duplicate H1s.
      if (feature.key === 'heading') {
        return HeadingFeature({
          enabledHeadingSizes: ['h2', 'h3', 'h4', 'h5', 'h6'],
        })
      }
      if (feature.key === 'link') {
        return LinkFeature({
          enabledCollections: [...RICH_TEXT_RELATION_COLLECTIONS],
          maxDepth: 2,
        })
      }
      if (feature.key === 'relationship') {
        return RelationshipFeature({
          enabledCollections: [...RICH_TEXT_RELATION_COLLECTIONS],
          maxDepth: 2,
        })
      }
      if (feature.key === 'upload') {
        return UploadFeature({
          collections: {
            media: {
              fields: [uploadWidthModeField, uploadMaxWidthPxField, uploadWidthPercentField],
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
    FixedToolbarFeature(),
    BlocksFeature({
      blocks: nazemiLexicalEmbedBlocks,
    }),
  ],
})

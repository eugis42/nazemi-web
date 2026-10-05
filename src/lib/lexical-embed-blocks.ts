import type { Block, Field } from 'payload'

import { ExpandingParagraphBlock } from '@/blocks/expandingParagraph'
import { GalleryBlock, LogoStripBlock, ThreeColumnsBlock } from '@/blocks/pageBlocks'
import { SpeakersBlock } from '@/blocks/workshopBlocks'
import { nazemiNestedLexicalEditor } from '@/lib/lexical-nested-editor'

/**
 * Lexical BlocksFeature copy of Sloupce — column `body` uses nested editor (no BlocksFeature).
 * Reusing page `ThreeColumnsBlock` as-is recurses generateSchemaMap forever
 * (richText → BlocksFeature → threeColumns → richText → …).
 */
function threeColumnsForLexical(block: Block): Block {
  return {
    ...block,
    fields: block.fields.map((field: Field) => {
      if (field.type !== 'array' || field.name !== 'columns') return field
      return {
        ...field,
        fields: field.fields.map((inner: Field) => {
          if (inner.type !== 'richText' || inner.name !== 'body') return inner
          return {
            ...inner,
            editor: nazemiNestedLexicalEditor,
            admin: {
              ...('admin' in inner ? inner.admin : undefined),
              description:
                'Text sloupce. V rich textu bez vnořených bloků (galerie / Lidé / Sloupce).',
            },
          }
        }),
      }
    }),
  }
}

/** Shared list for BlocksFeature + fixed-toolbar Add (+) menu. */
export const nazemiLexicalEmbedBlocks: Block[] = [
  GalleryBlock,
  LogoStripBlock,
  ExpandingParagraphBlock,
  SpeakersBlock,
  threeColumnsForLexical(ThreeColumnsBlock),
]

export function lexicalEmbedBlockMenuItems(): { label: string; slug: string }[] {
  return nazemiLexicalEmbedBlocks.map((block) => ({
    slug: block.slug,
    label:
      typeof block.labels?.singular === 'string' ? block.labels.singular : block.slug,
  }))
}

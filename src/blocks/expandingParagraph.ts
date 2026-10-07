import type { Block } from 'payload'

import { BLOCK_GROUP_PAGE, blockPickerAdmin } from '@/blocks/blockMeta'
import { nazemiNestedLexicalEditor } from '@/lib/lexical-nested-editor'

/**
 * Expanding disclosure — page/workshop blocks field + Lexical BlocksFeature.
 * Nested body editor (no BlocksFeature) avoids expand-in-expand.
 */
export const ExpandingParagraphBlock: Block = {
  slug: 'expandingParagraph',
  labels: {
    plural: 'Rozbalovací odstavce',
    singular: 'Rozbalovací odstavec',
  },
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_PAGE,
    thumb: 'expandingParagraph',
    alt: 'Rozbalovací odstavec',
  }),
  fields: [
    {
      name: 'summary',
      type: 'text',
      label: 'Text u šipky',
      required: true,
      admin: {
        description: 'Viditelný text vedle šipky (kliknutím se obsah rozbalí).',
      },
    },
    {
      name: 'body',
      type: 'richText',
      label: 'Obsah',
      required: true,
      editor: nazemiNestedLexicalEditor,
      admin: {
        description: 'Text uvnitř rozbalení (bez vnořených galerií / rozbalení).',
      },
    },
  ],
}

import type { Block } from 'payload'

import { nazemiNestedLexicalEditor } from '@/lib/lexical-nested-editor'

/**
 * Lexical BlocksFeature only — expanding disclosure with summary label + body.
 * Easier than a custom Lexical node: same Payload fields + FE `<details>`.
 */
export const ExpandingParagraphBlock: Block = {
  slug: 'expandingParagraph',
  labels: {
    plural: 'Rozbalovací odstavce',
    singular: 'Rozbalovací odstavec',
  },
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

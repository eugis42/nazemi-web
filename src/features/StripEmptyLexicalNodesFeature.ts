import { createServerFeature } from '@payloadcms/richtext-lexical'

import { sanitizeLexicalOnSave } from '@/lib/sanitize-lexical'

/**
 * Payload has no “strip empty paragraphs” editor setting.
 * Docs recommend field `beforeChange` + `hasText` — this feature registers that
 * hook on every richText using our Lexical editor (root + nested).
 */
export const StripEmptyLexicalNodesFeature = createServerFeature({
  feature: {
    hooks: {
      beforeChange: [({ value }) => sanitizeLexicalOnSave(value)],
    },
  },
  key: 'stripEmptyLexicalNodes',
})

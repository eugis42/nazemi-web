import { describe, expect, it } from 'vitest'

import { withNestedLexicalEditor } from '@/lib/form-builder-fields'
import { nazemiNestedLexicalEditor } from '@/lib/lexical-nested-editor'

describe('withNestedLexicalEditor', () => {
  it('swaps richText editors and walks arrays/blocks', () => {
    const patched = withNestedLexicalEditor({
      name: 'fields',
      type: 'blocks',
      blocks: [
        {
          slug: 'message',
          fields: [
            {
              name: 'message',
              type: 'richText',
              // pretend root editor was attached
              editor: undefined,
            },
          ],
        },
      ],
    })

    expect(patched.type).toBe('blocks')
    if (patched.type !== 'blocks') return
    const message = patched.blocks[0]?.fields[0]
    expect(message?.type).toBe('richText')
    if (message?.type !== 'richText') return
    expect(message.editor).toBe(nazemiNestedLexicalEditor)
  })
})

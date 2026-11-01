import { describe, expect, it } from 'vitest'

import { sanitizeLexicalOnSave } from '@/lib/sanitize-lexical'

function editor(children: unknown[]) {
  return {
    root: {
      children,
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

function paragraph(children: unknown[] = []) {
  return {
    children,
    direction: null,
    format: '',
    indent: 0,
    textFormat: 0,
    textStyle: '',
    type: 'paragraph',
    version: 1,
  }
}

function text(value: string) {
  return {
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    text: value,
    type: 'text',
    version: 1,
  }
}

describe('sanitizeLexicalOnSave', () => {
  it('returns null for empty / whitespace-only editor', () => {
    expect(sanitizeLexicalOnSave(null)).toBeNull()
    expect(sanitizeLexicalOnSave(editor([paragraph()]))).toBeNull()
    expect(sanitizeLexicalOnSave(editor([paragraph([text('   ')])]))).toBeNull()
  })

  it('strips empty paragraphs between real content', () => {
    const cleaned = sanitizeLexicalOnSave(
      editor([
        paragraph([text('Ahoj')]),
        paragraph(),
        paragraph([text('')]),
        paragraph([text('Svět')]),
        paragraph(),
      ]),
    )
    expect(cleaned?.root.children).toHaveLength(2)
    const first = cleaned?.root.children[0] as unknown as { children: { text: string }[] }
    const second = cleaned?.root.children[1] as unknown as { children: { text: string }[] }
    expect(first.children[0].text).toBe('Ahoj')
    expect(second.children[0].text).toBe('Svět')
  })

  it('keeps upload / relationship / block nodes', () => {
    const cleaned = sanitizeLexicalOnSave(
      editor([
        paragraph(),
        { type: 'upload', value: 1, relationTo: 'media', version: 3 },
        paragraph(),
      ]),
    )
    expect(cleaned?.root.children).toHaveLength(1)
    expect(cleaned?.root.children[0]).toMatchObject({ type: 'upload' })
  })

  it('keeps Shift+Enter linebreaks inside headings / paragraphs', () => {
    const linebreak = { type: 'linebreak', version: 1 }
    const cleaned = sanitizeLexicalOnSave(
      editor([
        {
          children: [text('Řádek jedna'), linebreak, text('Řádek dva')],
          direction: null,
          format: '',
          indent: 0,
          tag: 'h2',
          type: 'heading',
          version: 1,
        },
      ]),
    )
    const heading = cleaned?.root.children[0] as unknown as { children: { type: string }[] }
    expect(heading.children.map((c) => c.type)).toEqual(['text', 'linebreak', 'text'])
  })
})

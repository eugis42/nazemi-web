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
})

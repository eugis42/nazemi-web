import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { NazemiRichText } from '@/components/frontend/NazemiRichText'
import { isTextColorToken, textColorCss } from '@/lib/lexical-text-color'

/** Minimal Lexical doc: coloured + bold text node (TextStateFeature `$`). */
function colouredDoc(opts: { color: string; format?: number; text?: string }) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr' as const,
          children: [
            {
              type: 'text',
              text: opts.text ?? 'barevný text',
              mode: 'normal',
              style: '',
              detail: 0,
              format: opts.format ?? 0,
              version: 1,
              $: { color: opts.color },
            },
          ],
        },
      ],
    },
  }
}

describe('lexical text colour FE', () => {
  it('resolves brand + extra tokens to site CSS vars', () => {
    expect(isTextColorToken('ground')).toBe(true)
    expect(isTextColorToken('green')).toBe(true)
    expect(isTextColorToken('extra-0')).toBe(true)
    expect(isTextColorToken('extra-11')).toBe(true)
    expect(isTextColorToken('extra-12')).toBe(false)
    expect(isTextColorToken('#ff0000')).toBe(false)
    expect(textColorCss('green')).toBe('var(--color-green)')
    expect(textColorCss('extra-3')).toBe('var(--color-extra-3)')
  })

  it('wraps coloured text in .rt-text-color with inline CSS var', () => {
    const html = renderToStaticMarkup(
      createElement(NazemiRichText, { data: colouredDoc({ color: 'green' }) as never }),
    )
    expect(html).toContain('rt-text-color')
    expect(html).toContain('data-color="green"')
    expect(html).toContain('color:var(--color-green)')
  })

  it('keeps colour wrapper outside bold/italic so CSS inherit can win', () => {
    // format 1 = bold (NodeFormat.IS_BOLD)
    const html = renderToStaticMarkup(
      createElement(NazemiRichText, {
        data: colouredDoc({ color: 'extra-0', format: 1 }) as never,
      }),
    )
    expect(html).toMatch(
      /rt-text-color[^>]*>[\s\S]*<strong>barevný text<\/strong>/,
    )
    expect(html).toContain('color:var(--color-extra-0)')
  })

  it('prose CSS forces .rt-text-color descendants to inherit colour', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/app/(frontend)/styles.css'),
      'utf8',
    )
    expect(css).toMatch(
      /\.rt-text-color\s+:where\(strong,\s*b,\s*em,\s*i,\s*code,\s*a,\s*sub,\s*sup\)\s*\{\s*color:\s*inherit/,
    )
  })
})

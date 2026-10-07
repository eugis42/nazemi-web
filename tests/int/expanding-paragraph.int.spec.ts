import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ExpandingParagraphBlock } from '@/blocks/expandingParagraph'
import { pageBlocks } from '@/blocks/pageBlocks'
import { ExpandingParagraph } from '@/components/frontend/ExpandingParagraph'

describe('expandingParagraph', () => {
  it('is pickable in page blocks pool', () => {
    expect(pageBlocks.some((b) => b.slug === 'expandingParagraph')).toBe(true)
    expect(ExpandingParagraphBlock.admin?.group).toBe('Obsah stránky')
  })

  it('keeps prose-nazemi outside not-prose so list markers apply', () => {
    const body = createElement('ul', null, createElement('li', null, 'položka'))
    const html = renderToStaticMarkup(
      createElement(ExpandingParagraph, { body, summary: 'Nadpis' }),
    )
    expect(html).toContain('data-rt-block="expandingParagraph"')
    expect(html).toContain('prose-nazemi')
    // not-prose on <details> would kill nested .prose list styles
    expect(html).not.toMatch(/<details[^>]*\bnot-prose\b/)
    expect(html).toMatch(/<summary[^>]*\bnot-prose\b/)
  })
})

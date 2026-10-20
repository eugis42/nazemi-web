import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CallToActionBlock } from '@/blocks/callToAction'
import { pageBlocks } from '@/blocks/pageBlocks'
import { CallToActionBlockView } from '@/components/frontend/CallToActionBlock'
import { nazemiLexicalEmbedBlocks } from '@/lib/lexical-embed-blocks'

describe('callToAction', () => {
  it('is pickable in page blocks + Lexical embeds', () => {
    expect(pageBlocks.some((b) => b.slug === 'callToAction')).toBe(true)
    expect(nazemiLexicalEmbedBlocks.some((b) => b.slug === 'callToAction')).toBe(true)
    expect(CallToActionBlock.admin?.group).toBe('Obsah stránky')
  })

  it('renders buttons without title', () => {
    const html = renderToStaticMarkup(
      createElement(CallToActionBlockView, {
        block: {
          actions: [{ href: '/kontakt', label: 'Kontakt', linkType: 'external', variant: 'filled' }],
        },
        siteSlug: 'nazemi',
      }),
    )
    expect(html).toContain('data-block="callToAction"')
    expect(html).toContain('Kontakt')
    expect(html).not.toContain('<h2')
  })

  it('stacks section title above left-aligned buttons', () => {
    const html = renderToStaticMarkup(
      createElement(CallToActionBlockView, {
        block: {
          actions: [{ href: '/kontakt', label: 'Kontakt', linkType: 'external' }],
          title: 'Zapojte se',
        },
        siteSlug: 'nazemi',
      }),
    )
    expect(html).toContain('Zapojte se')
    expect(html).toContain('text-section-title')
    expect(html).toContain('justify-start')
    expect(html).not.toContain('data-component="block-header"')
  })
})

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FormEmbedBlock } from '@/blocks/formEmbed'
import { pageBlocks } from '@/blocks/pageBlocks'
import { FormEmbedBlockView } from '@/components/frontend/FormEmbedBlock'
import {
  checkFormBotBasics,
  checkFormRateLimit,
  clearFormRateLimitForTests,
  FORM_MIN_FILL_MS,
  FORM_RATE_LIMIT_MAX,
} from '@/lib/form-bot-guard'
import { nazemiLexicalEmbedBlocks } from '@/lib/lexical-embed-blocks'

describe('formEmbed + bot guard', () => {
  it('is pickable in page blocks + Lexical embeds', () => {
    expect(pageBlocks.some((b) => b.slug === 'formEmbed')).toBe(true)
    expect(nazemiLexicalEmbedBlocks.some((b) => b.slug === 'formEmbed')).toBe(true)
    expect(FormEmbedBlock.admin?.group).toBe('Obsah stránky')
  })

  it('renders vztahy-style banner', () => {
    const html = renderToStaticMarkup(
      createElement(FormEmbedBlockView, {
        block: {
          buttonLabel: 'Napsat nám',
          form: 1,
          title: 'Kontaktujte nás',
          description: 'Ozvěte se',
        },
        siteSlug: 'nazemi',
      }),
    )
    expect(html).toContain('data-block="formEmbed"')
    expect(html).toContain('bg-ground/5')
    expect(html).toContain('Kontaktujte nás')
    expect(html).toContain('Napsat nám')
  })

  it('rejects honeypot and too-fast submits', () => {
    const now = 1_700_000_000_000
    expect(
      checkFormBotBasics({ honeypot: 'http://spam', openedAt: now - 5000, now }).ok,
    ).toBe(false)
    expect(
      checkFormBotBasics({ honeypot: '', openedAt: now - 100, now }).ok,
    ).toBe(false)
    expect(
      checkFormBotBasics({
        honeypot: '',
        openedAt: now - FORM_MIN_FILL_MS - 10,
        now,
      }).ok,
    ).toBe(true)
  })

  it('soft rate-limits by IP', () => {
    clearFormRateLimitForTests()
    const now = 1_700_000_000_000
    for (let i = 0; i < FORM_RATE_LIMIT_MAX; i++) {
      expect(checkFormRateLimit('1.2.3.4', now + i).ok).toBe(true)
    }
    expect(checkFormRateLimit('1.2.3.4', now + FORM_RATE_LIMIT_MAX).ok).toBe(false)
    expect(checkFormRateLimit('9.9.9.9', now).ok).toBe(true)
  })
})

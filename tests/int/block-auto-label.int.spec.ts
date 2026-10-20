import { describe, expect, it } from 'vitest'

import { lexicalPlainText } from '@/lib/block-auto-label'

describe('lexicalPlainText', () => {
  it('prefers heading over paragraph', () => {
    expect(
      lexicalPlainText({
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Odstavec' }],
            },
            {
              type: 'heading',
              children: [{ type: 'text', text: 'Hlavní' }],
            },
          ],
        },
      }),
    ).toBe('Hlavní')
  })

  it('trims long text', () => {
    const long = 'x'.repeat(50)
    const out = lexicalPlainText({
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: long }],
          },
        ],
      },
    })
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(41)
  })
})

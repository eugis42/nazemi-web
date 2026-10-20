import { describe, expect, it } from 'vitest'

import { reorderFormsNavPlugin } from '@/lib/reorder-forms-nav'

describe('reorderFormsNavPlugin', () => {
  it('places forms after prehledy', () => {
    const out = reorderFormsNavPlugin({
      collections: [
        { slug: 'stranky' },
        { slug: 'prehledy' },
        { slug: 'media' },
        { slug: 'forms' },
        { slug: 'form-submissions' },
      ],
    } as never)

    const collections = 'then' in out ? undefined : out.collections
    expect(collections?.map((c: { slug: string }) => c.slug)).toEqual([
      'stranky',
      'prehledy',
      'forms',
      'form-submissions',
      'media',
    ])
  })
})

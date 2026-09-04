import { describe, expect, it } from 'vitest'

import { formatEventPlace } from '@/lib/content'

describe('formatEventPlace', () => {
  it('joins name, street, city', () => {
    expect(
      formatEventPlace({ name: 'NaNebi', address: 'Kounicova 42', city: 'Brno' }),
    ).toBe('NaNebi, Kounicova 42, Brno')
  })

  it('skips empty parts', () => {
    expect(formatEventPlace({ name: 'Náměstí Republiky', city: 'Praha' })).toBe(
      'Náměstí Republiky, Praha',
    )
    expect(formatEventPlace(null)).toBe('')
  })
})

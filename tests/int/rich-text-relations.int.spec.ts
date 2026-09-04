import { describe, expect, it } from 'vitest'

import { RICH_TEXT_RELATION_COLLECTIONS } from '@/lib/lexical-editor'

describe('RICH_TEXT_RELATION_COLLECTIONS', () => {
  it('lists only the seven public embed types', () => {
    expect([...RICH_TEXT_RELATION_COLLECTIONS].sort()).toEqual(
      [
        'aktuality',
        'kalendar',
        'lide',
        'projekty',
        'publikace',
        'stranky',
        'workshopy',
      ].sort(),
    )
  })
})

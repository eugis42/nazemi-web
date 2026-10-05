import { describe, expect, it } from 'vitest'

import { allBlocks, legacyBlocks } from '@/blocks/allBlocks'

describe('pageIntro picker hide', () => {
  it('keeps pageIntro registered for existing docs', () => {
    expect(allBlocks.some((b) => b.slug === 'pageIntro')).toBe(true)
    expect(legacyBlocks.map((b) => b.slug)).toEqual(['pageIntro'])
  })

  it('exposes pageIntro only as legacy config block, not via filterOptions', async () => {
    // filterOptions approach was removed — importing should not export it
    const mod = await import('@/blocks/allBlocks')
    expect('allBlocksFilterOptions' in mod).toBe(false)
    expect('pickableBlockSlugs' in mod).toBe(false)
  })
})

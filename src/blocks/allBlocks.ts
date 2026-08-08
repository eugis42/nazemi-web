import type { Block } from 'payload'

import { homepageBlocks } from './homepageBlocks'
import { pageBlocks } from './pageBlocks'
import { workshopOnlyBlocks } from './workshopBlocks'

/** Deduplicate by slug — first definition wins. */
function uniqueBlocks(blocks: Block[]): Block[] {
  const seen = new Set<string>()
  const out: Block[] = []
  for (const block of blocks) {
    if (seen.has(block.slug)) continue
    seen.add(block.slug)
    out.push(block)
  }
  return out
}

/**
 * Universal block pool for homepage, pages, and workshops.
 * Always includes Textový blok (`richText`) plus homepage + page + workshop blocks.
 */
export const allBlocks = uniqueBlocks([
  ...homepageBlocks,
  ...pageBlocks,
  ...workshopOnlyBlocks,
])

import type { Block } from 'payload'

import { homepageBlocks } from './homepageBlocks'
import { PageIntroBlock, pageBlocks } from './pageBlocks'
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
 * `pageIntro` stays registered for existing docs; picker hides it via
 * `BlocksFieldHidePageIntro` (not `filterOptions` — that couples drawer + validation).
 */
export const allBlocks = uniqueBlocks([
  ...homepageBlocks,
  ...pageBlocks,
  ...workshopOnlyBlocks,
  PageIntroBlock,
])

/** Top-level `config.blocks` entry so admin `blocksMap` can resolve legacy rows
 * after the field Field component filters `pageIntro` out of the pick list. */
export const legacyBlocks = [PageIntroBlock]

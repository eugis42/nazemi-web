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
 * `pageIntro` stays registered for existing docs but is not offered for new picks
 * (`allBlocksFilterOptions`).
 */
export const allBlocks = uniqueBlocks([
  ...homepageBlocks,
  ...pageBlocks,
  ...workshopOnlyBlocks,
  PageIntroBlock,
])

const HIDDEN_FROM_PICKER = new Set(['pageIntro'])

export const pickableBlockSlugs = allBlocks
  .map((block) => block.slug)
  .filter((slug) => !HIDDEN_FROM_PICKER.has(slug))

function siblingHasHiddenBlock(siblingData: unknown): boolean {
  if (!siblingData || typeof siblingData !== 'object') return false
  const data = siblingData as Record<string, unknown>
  for (const key of ['content', 'homepageContent', 'blocks'] as const) {
    const rows = data[key]
    if (!Array.isArray(rows)) continue
    if (
      rows.some(
        (row) =>
          row &&
          typeof row === 'object' &&
          HIDDEN_FROM_PICKER.has((row as { blockType?: string }).blockType ?? ''),
      )
    ) {
      return true
    }
  }
  return false
}

/**
 * Hide legacy blocks from the picker. If a doc already has one, keep its slug
 * allowed so save validation does not reject the existing row.
 */
export const allBlocksFilterOptions = ({
  data,
  siblingData,
}: {
  data?: unknown
  siblingData?: unknown
}): string[] => {
  if (siblingHasHiddenBlock(siblingData) || siblingHasHiddenBlock(data)) {
    return [...pickableBlockSlugs, ...HIDDEN_FROM_PICKER]
  }
  return pickableBlockSlugs
}

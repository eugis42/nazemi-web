'use client'

import { useMemo } from 'react'
import { BlocksField } from '@payloadcms/ui'
import type { BlocksFieldClientComponent, ClientBlock } from 'payload'

/** Legacy — still registered for existing rows; never offered in Add Block. */
const HIDDEN_FROM_PICKER = new Set(['pageIntro'])

function isPickableBlock(block: ClientBlock | string): boolean {
  const slug = typeof block === 'string' ? block : block.slug
  return !HIDDEN_FROM_PICKER.has(slug)
}

/**
 * Payload `filterOptions` ties picker + validation: excluding a slug that's
 * already in the doc marks that row invalid; including it puts it back in
 * the drawer. Filter the client blocks list instead — existing `pageIntro`
 * rows still resolve via `config.blocksMap`.
 */
export const BlocksFieldHidePageIntro: BlocksFieldClientComponent = (props) => {
  const field = useMemo(() => {
    const blocks = props.field.blockReferences ?? props.field.blocks
    if (!blocks?.length) return props.field

    const pickable = blocks.filter(isPickableBlock)
    if (pickable.length === blocks.length) return props.field

    if (props.field.blockReferences) {
      return { ...props.field, blockReferences: pickable }
    }
    return { ...props.field, blocks: pickable as ClientBlock[] }
  }, [props.field])

  return <BlocksField {...props} field={field} />
}

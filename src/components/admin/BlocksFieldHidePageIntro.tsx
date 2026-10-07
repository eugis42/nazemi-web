'use client'

import { useMemo, useState, useEffect } from 'react'
import { BlocksField } from '@payloadcms/ui'
import type { BlocksFieldClientComponent, ClientBlock } from 'payload'

/** Legacy — still registered for existing rows; never offered in Add Block. */
const HIDDEN_FROM_PICKER = new Set(['pageIntro'])

function blockSlug(block: ClientBlock | string): string {
  return typeof block === 'string' ? block : block.slug
}

function isPickableBlock(block: ClientBlock | string): boolean {
  return !HIDDEN_FROM_PICKER.has(blockSlug(block))
}

/**
 * Payload `filterOptions` ties picker + validation: excluding a slug that's
 * already in the doc marks that row invalid; including it puts it back in
 * the drawer. Filter the client blocks list instead — existing `pageIntro`
 * rows still resolve via `config.blocksMap`.
 *
 * Filter only after mount so SSR + first client paint match (avoids hydration
 * mismatch that can strand ADD_ROW rows in `isLoading` shimmer).
 */
export const BlocksFieldHidePageIntro: BlocksFieldClientComponent = (props) => {
  const [hidePageIntro, setHidePageIntro] = useState(false)
  useEffect(() => {
    setHidePageIntro(true)
  }, [])

  const field = useMemo(() => {
    if (!hidePageIntro) return props.field

    const blocks = props.field.blockReferences ?? props.field.blocks
    if (!blocks?.length) return props.field

    const pickable = blocks.filter(isPickableBlock)
    if (pickable.length === blocks.length) return props.field

    if (props.field.blockReferences) {
      return { ...props.field, blockReferences: pickable }
    }
    return { ...props.field, blocks: pickable as ClientBlock[] }
  }, [props.field, hidePageIntro])

  return <BlocksField {...props} field={field} />
}

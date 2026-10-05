'use client'

import {
  INSERT_BLOCK_COMMAND,
  createClientFeature,
  toolbarAddDropdownGroupWithItems,
} from '@payloadcms/richtext-lexical/client'

type BlockMenuItem = {
  label: string
  slug: string
}

type Props = {
  blocks?: BlockMenuItem[]
}

export const BlocksInToolbarAddFeatureClient = createClientFeature(({ props }) => {
  const blocks = (props as Props | undefined)?.blocks ?? []
  if (!blocks.length) return {}

  return {
    toolbarFixed: {
      groups: [
        toolbarAddDropdownGroupWithItems(
          blocks.map((block, index) => ({
            key: `block-${block.slug}`,
            label: block.label,
            order: 100 + index,
            onSelect: ({ editor }) => {
              editor.dispatchCommand(INSERT_BLOCK_COMMAND, {
                blockName: '',
                blockType: block.slug,
              })
            },
          })),
        ),
      ],
    },
  }
})

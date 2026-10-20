import type { Block } from 'payload'

import { BLOCK_GROUP_PAGE, blockPickerAdmin } from '@/blocks/blockMeta'
import { callToActionField } from '@/fields/cta'

/**
 * Standalone CTA band — optional heading + multiple buttons.
 * Buttons share Navigace link UI + variant fields via `callToActionField`.
 */
export const CallToActionBlock: Block = {
  slug: 'callToAction',
  labels: {
    plural: 'Call to Action',
    singular: 'Call to Action',
  },
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_PAGE,
    thumb: 'callToAction',
    alt: 'Call to Action',
  }),
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis',
      admin: {
        description: 'Volitelné — bez nadpisu se zobrazí jen tlačítka.',
      },
    },
    callToActionField({
      admin: {
        components: {
          RowLabel: '/components/admin/MenuItemRowLabel#MenuItemRowLabel',
        },
        description: 'Jedno nebo více tlačítek.',
        initCollapsed: true,
      },
      maxRows: 6,
      minRows: 1,
      required: true,
    }),
  ],
}

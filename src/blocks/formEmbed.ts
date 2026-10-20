import type { Block } from 'payload'

import { BLOCK_GROUP_PAGE, blockPickerAdmin } from '@/blocks/blockMeta'
import { relationId } from '@/lib/collection-homes'

/**
 * Banner that opens a Form Builder form in a modal.
 * Form picker scoped to the parent document’s site.
 */
export const FormEmbedBlock: Block = {
  slug: 'formEmbed',
  labels: {
    plural: 'Formuláře',
    singular: 'Formulář',
  },
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_PAGE,
    thumb: 'formEmbed',
    alt: 'Formulář',
  }),
  fields: [
    {
      name: 'form',
      type: 'relationship',
      label: 'Formulář',
      relationTo: 'forms',
      required: true,
      filterOptions: ({ data }) => {
        const siteId = relationId(data?.site)
        if (siteId == null) return false
        return { site: { equals: siteId } }
      },
      admin: {
        description: 'Formuláře z aktuálního webu.',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis banneru',
      required: true,
    },
    {
      name: 'buttonLabel',
      type: 'text',
      label: 'Text tlačítka',
      defaultValue: 'Vyplnit formulář',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Popis',
      admin: {
        description: 'Volitelný krátký text pod nadpisem.',
      },
    },
  ],
}

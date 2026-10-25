import type { Block } from 'payload'

import { BLOCK_GROUP_PAGE, blockPickerAdmin } from '@/blocks/blockMeta'

const TAGS_TARGETS = ['kalendar', 'aktuality', 'workshopy-topic', 'publikace-topic'] as const

function isTagsTarget(value: unknown): boolean {
  return typeof value === 'string' && (TAGS_TARGETS as readonly string[]).includes(value)
}

/**
 * Link to a listing filtered by taxonomy (tag / audience / publication type).
 * Card shows collection | tag — not a full content vztahy embed.
 */
export const FilterLinkBlock: Block = {
  slug: 'filterLink',
  labels: {
    plural: 'Odkazy na filtr',
    singular: 'Odkaz na filtr',
  },
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_PAGE,
    thumb: 'filterLink',
    alt: 'Odkaz na filtr',
  }),
  fields: [
    {
      name: 'target',
      type: 'select',
      label: 'Kolekce / filtr',
      required: true,
      options: [
        { label: 'Kalendář — téma', value: 'kalendar' },
        { label: 'Aktuality — téma', value: 'aktuality' },
        { label: 'Workshopy — téma', value: 'workshopy-topic' },
        { label: 'Workshopy — cílová skupina', value: 'workshopy-audience' },
        { label: 'Publikace — typ', value: 'publikace-type' },
        { label: 'Publikace — téma', value: 'publikace-topic' },
      ],
      admin: {
        description: 'Určí listing a typ taxonomie (levá část tlačítka).',
      },
    },
    {
      name: 'tag',
      type: 'relationship',
      label: 'Téma',
      relationTo: 'tags',
      required: true,
      admin: {
        condition: (_, siblingData) => isTagsTarget(siblingData?.target),
        description: 'Pravá část tlačítka.',
      },
    },
    {
      name: 'audience',
      type: 'relationship',
      label: 'Cílová skupina',
      relationTo: 'workshop-audiences',
      required: true,
      admin: {
        condition: (_, siblingData) => siblingData?.target === 'workshopy-audience',
        description: 'Pravá část tlačítka.',
      },
    },
    {
      name: 'publicationType',
      type: 'relationship',
      label: 'Typ publikace',
      relationTo: 'publication-types',
      required: true,
      admin: {
        condition: (_, siblingData) => siblingData?.target === 'publikace-type',
        description: 'Pravá část tlačítka.',
      },
    },
  ],
}

import type { Block } from 'payload'

import {
  BLOCK_GROUP_WORKSHOP,
  blockPickerAdmin,
} from '@/blocks/blockMeta'
import { imageUploadFilter } from '@/fields/shared'
import { RichTextBlock } from './pageBlocks'

export { RichTextBlock }

export const SpeakersBlock: Block = {
  slug: 'speakers',
  labels: {
    plural: 'Lidé',
    singular: 'Lidé',
  },
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_WORKSHOP,
    thumb: 'speakers',
  }),
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis',
      defaultValue: 'Lidé',
      required: true,
    },
    {
      name: 'people',
      type: 'array',
      label: 'Lidé',
      admin: {
        components: {
          RowLabel: '/components/admin/ArrayFieldRowLabel#ArrayFieldRowLabel',
        },
        description: 'Osoby v bloku. Lze předvyplnit z kolekce Lidé; Výrok je samostatný.',
        initCollapsed: true,
      },
      labels: {
        plural: 'Lidé',
        singular: 'Osoba',
      },
      minRows: 1,
      fields: [
        {
          name: 'fromPerson',
          type: 'relationship',
          label: 'Vybrat z Lidé',
          relationTo: 'lide',
          filterOptions: ({ data }) => {
            const site = (data as { site?: unknown } | null | undefined)?.site
            const siteId =
              site != null && typeof site === 'object' && 'id' in site
                ? (site as { id: number | string }).id
                : typeof site === 'number' || typeof site === 'string'
                  ? site
                  : null
            if (siteId == null) return false
            return { site: { equals: siteId } }
          },
          admin: {
            components: {
              Field: '/components/admin/SpeakersFromPersonField#SpeakersFromPersonField',
            },
            description:
              'Volitelně — vyplní fotku, jméno a roli. Pole zůstanou editovatelná; Výrok se nemění.',
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'Jméno',
              required: true,
              admin: { width: '50%' },
            },
            {
              name: 'role',
              type: 'text',
              label: 'Role',
              admin: { width: '50%' },
            },
          ],
        },
        {
          name: 'image',
          type: 'upload',
          label: 'Fotografie',
          relationTo: 'media',
          filterOptions: imageUploadFilter,
        },
        {
          name: 'quote',
          type: 'textarea',
          label: 'Výrok',
          admin: {
            description: 'Volitelně — zobrazí se pod fotkou a jménem jako běžný odstavec.',
          },
        },
      ],
    },
  ],
}

export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  labels: {
    plural: 'Reference',
    singular: 'Reference',
  },
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_WORKSHOP,
    thumb: 'testimonials',
  }),
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis',
      defaultValue: 'Co o workshopu říkají',
      required: true,
    },
    {
      name: 'items',
      type: 'array',
      label: 'Citace',
      labels: {
        plural: 'Citace',
        singular: 'Citace',
      },
      minRows: 1,
      admin: {
        components: {
          RowLabel: '/components/admin/ArrayFieldRowLabel#ArrayFieldRowLabel',
        },
        initCollapsed: true,
      },
      fields: [
        {
          name: 'quote',
          type: 'textarea',
          label: 'Citát',
          required: true,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'author',
              type: 'text',
              label: 'Autor',
              required: true,
              admin: { width: '45%' },
            },
            {
              name: 'role',
              type: 'text',
              label: 'Role / kontext',
              admin: { width: '55%' },
            },
          ],
        },
      ],
    },
  ],
}

/** Workshop-only blocks (richText comes from shared pool). */
export const workshopOnlyBlocks = [SpeakersBlock, TestimonialsBlock]

/** @deprecated Prefer `allBlocks` — kept for imports that expect this name. */
export const workshopBlocks = [RichTextBlock, SpeakersBlock, TestimonialsBlock]

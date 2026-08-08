import type { Block } from 'payload'

import { RichTextBlock } from './pageBlocks'

export { RichTextBlock }

export const SpeakersBlock: Block = {
  slug: 'speakers',
  labels: {
    plural: 'Lektoři',
    singular: 'Lektoři',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis',
      defaultValue: 'Lektoři a facilitátoři',
      required: true,
    },
    {
      name: 'people',
      type: 'array',
      label: 'Lidé',
      admin: {
        description: 'Jména lektorů u workshopu (odděleně od kontaktu Lidé).',
        initCollapsed: true,
      },
      labels: {
        plural: 'Lidé',
        singular: 'Osoba',
      },
      minRows: 1,
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Jméno',
          required: true,
        },
        {
          name: 'role',
          type: 'text',
          label: 'Role',
        },
        {
          name: 'image',
          type: 'upload',
          label: 'Fotografie',
          relationTo: 'media',
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
          name: 'author',
          type: 'text',
          label: 'Autor',
          required: true,
        },
        {
          name: 'role',
          type: 'text',
          label: 'Role / kontext',
        },
      ],
    },
  ],
}

/** Workshop-only blocks (richText comes from shared pool). */
export const workshopOnlyBlocks = [SpeakersBlock, TestimonialsBlock]

/** @deprecated Prefer `allBlocks` — kept for imports that expect this name. */
export const workshopBlocks = [RichTextBlock, SpeakersBlock, TestimonialsBlock]

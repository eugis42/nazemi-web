import type { Block } from 'payload'

import { additionalColorField } from '@/fields/additionalColor'

export const RichTextBlock: Block = {
  slug: 'richText',
  labels: {
    plural: 'Textové bloky',
    singular: 'Textový blok',
  },
  fields: [
    {
      name: 'content',
      type: 'richText',
      label: 'Obsah',
      required: true,
    },
  ],
}

export const GalleryBlock: Block = {
  slug: 'gallery',
  labels: {
    plural: 'Galerie',
    singular: 'Galerie',
  },
  fields: [
    {
      name: 'images',
      type: 'upload',
      label: 'Obrázky',
      relationTo: 'media',
      hasMany: true,
      required: true,
      minRows: 1,
      filterOptions: {
        mimeType: { contains: 'image' },
      },
      admin: {
        description: 'Pouze obrázky — video patří do samostatného bloku.',
      },
    },
    {
      name: 'columns',
      type: 'select',
      label: 'Sloupce (desktop)',
      defaultValue: '2',
      options: [
        { label: '1', value: '1' },
        { label: '2', value: '2' },
        { label: '3', value: '3' },
      ],
      admin: {
        condition: (_, siblingData) =>
          Array.isArray(siblingData?.images) && siblingData.images.length > 1,
        description: 'Počet sloupců mřížky na desktopu (1–3).',
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Popisek',
    },
  ],
}

export const PageIntroBlock: Block = {
  slug: 'pageIntro',
  labels: {
    plural: 'Úvodní hlavičky',
    singular: 'Úvodní hlavička',
  },
  fields: [
    additionalColorField({
      allowNone: true,
      label: 'Barva pozadí',
      name: 'headerColor',
    }),
    {
      name: 'coverImage',
      type: 'upload',
      label: 'Úvodní obrázek',
      relationTo: 'media',
      admin: {
        description: 'Pokud je nastaven, překryje barevné pozadí.',
      },
    },
    {
      name: 'lead',
      type: 'textarea',
      label: 'Perex (volitelně přepíše perex stránky)',
    },
  ],
}

export const pageBlocks = [PageIntroBlock, RichTextBlock, GalleryBlock]

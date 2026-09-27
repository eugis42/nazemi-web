import type { Block } from 'payload'

import {
  BLOCK_GROUP_PAGE,
  blockPickerAdmin,
} from '@/blocks/blockMeta'
import { additionalColorField } from '@/fields/additionalColor'
import { columnCallToActionField } from '@/fields/cta'
import { imageUploadFilter } from '@/fields/shared'
import {
  hrefFieldDescription,
  validateOptionalHref,
} from '@/fields/validateHref'

export const RichTextBlock: Block = {
  slug: 'richText',
  labels: {
    plural: 'Textové bloky',
    singular: 'Textový blok',
  },
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_PAGE,
    thumb: 'richText',
  }),
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
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_PAGE,
    thumb: 'gallery',
  }),
  fields: [
    {
      name: 'images',
      type: 'upload',
      label: 'Obrázky',
      relationTo: 'media',
      hasMany: true,
      required: true,
      minRows: 1,
      filterOptions: imageUploadFilter,
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

/** Funding / government support logos — left-aligned strip, no lightbox. */
export const LogoStripBlock: Block = {
  slug: 'logoStrip',
  labels: {
    plural: 'Pásy log',
    singular: 'Pás log',
  },
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_PAGE,
    thumb: 'logoStrip',
  }),
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis',
      admin: {
        description: 'Volitelně — např. „Projekt podpořili“.',
      },
    },
    {
      name: 'logos',
      type: 'array',
      label: 'Loga',
      minRows: 1,
      required: true,
      labels: {
        plural: 'Loga',
        singular: 'Logo',
      },
      admin: {
        components: {
          RowLabel: '/components/admin/ArrayFieldRowLabel#ArrayFieldRowLabel',
        },
        description:
          'Loga partnerů / podpory. Bez lightboxu; zarovnání vlevo, pevný max. rozměr.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          label: 'Logo',
          relationTo: 'media',
          required: true,
          filterOptions: imageUploadFilter,
        },
        {
          name: 'href',
          type: 'text',
          label: 'Externí odkaz',
          admin: {
            description: hrefFieldDescription,
          },
          validate: validateOptionalHref,
        },
      ],
    },
  ],
}

export const PageIntroBlock: Block = {
  slug: 'pageIntro',
  labels: {
    plural: 'Úvodní hlavičky',
    singular: 'Úvodní hlavička',
  },
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_PAGE,
    thumb: 'pageIntro',
  }),
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
      filterOptions: imageUploadFilter,
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

export const ThreeColumnsBlock: Block = {
  slug: 'threeColumns',
  labels: {
    plural: '3 sloupce',
    singular: '3 sloupce',
  },
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_PAGE,
    thumb: 'threeColumns',
  }),
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis',
    },
    {
      name: 'columns',
      type: 'array',
      label: 'Sloupce',
      maxRows: 3,
      minRows: 1,
      labels: {
        plural: 'Sloupce',
        singular: 'Sloupec',
      },
      admin: {
        components: {
          RowLabel: '/components/admin/ArrayFieldRowLabel#ArrayFieldRowLabel',
        },
        description: 'Max. 3 sloupce.',
        initCollapsed: true,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'headline',
              type: 'text',
              label: 'Velký nadpis (1. řádek)',
              admin: {
                description: 'Akcentová barva — např. 150+. Prázdné → nezobrazí se.',
                width: '50%',
              },
            },
            {
              name: 'title',
              type: 'text',
              label: 'Nadpis (2. řádek)',
              admin: {
                description: 'Prázdné → nezobrazí se.',
                width: '50%',
              },
            },
          ],
        },
        {
          name: 'body',
          type: 'richText',
          label: 'Text',
        },
        columnCallToActionField(),
      ],
    },
  ],
}

export const ThreeCardsBlock: Block = {
  slug: 'threeCards',
  labels: {
    plural: '3 karty',
    singular: '3 karty',
  },
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_PAGE,
    thumb: 'threeCards',
  }),
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis',
    },
    {
      name: 'columns',
      type: 'array',
      label: 'Karty',
      maxRows: 3,
      minRows: 1,
      labels: {
        plural: 'Karty',
        singular: 'Karta',
      },
      admin: {
        components: {
          RowLabel: '/components/admin/ArrayFieldRowLabel#ArrayFieldRowLabel',
        },
        description: 'Max. 3 karty.',
        initCollapsed: true,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'prefix',
              type: 'text',
              label: 'Prefix (1. řádek)',
              admin: {
                description: 'Akcentová barva — např. Co:. Prázdné → nezobrazí se.',
                width: '35%',
              },
            },
            {
              name: 'title',
              type: 'text',
              label: 'Nadpis (2. řádek)',
              admin: {
                description: 'Prázdné → nezobrazí se.',
                width: '65%',
              },
            },
          ],
        },
        {
          name: 'body',
          type: 'richText',
          label: 'Text',
        },
        columnCallToActionField(),
      ],
    },
  ],
}

export const pageBlocks = [
  PageIntroBlock,
  RichTextBlock,
  GalleryBlock,
  LogoStripBlock,
  ThreeColumnsBlock,
  ThreeCardsBlock,
]

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

/**
 * Funding / government support logos — left-aligned strip, no lightbox.
 *
 * Upload is `hasMany` (not array→upload): Lexical BlocksFeature remounts the
 * block form when an upload drawer opens; array→upload nests break that drawer
 * (flash open/close). Same pattern as Galerie. Optional links align by index.
 */
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
      name: 'images',
      type: 'upload',
      label: 'Loga',
      relationTo: 'media',
      hasMany: true,
      required: true,
      minRows: 1,
      filterOptions: imageUploadFilter,
      admin: {
        description:
          'Loga partnerů / podpory. Bez lightboxu; zarovnání vlevo, max. 160×64.',
      },
    },
    {
      name: 'links',
      type: 'array',
      label: 'Odkazy (volitelně)',
      labels: {
        plural: 'Odkazy',
        singular: 'Odkaz',
      },
      admin: {
        description:
          'Pořadí = pořadí log výše (1. odkaz → 1. logo). Prázdné řádky = bez odkazu.',
        initCollapsed: true,
      },
      fields: [
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

/**
 * Sloupce — 1–3 columns. Slug stays `threeColumns` (DB tables + existing rows).
 * `borders` on → former Karty look; off → plain columns.
 * Column titles live in Lexical `body` as H2 (no separate headline/prefix/title fields).
 */
export const ThreeColumnsBlock: Block = {
  slug: 'threeColumns',
  labels: {
    plural: 'Sloupce',
    singular: 'Sloupce',
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
      name: 'borders',
      type: 'checkbox',
      label: 'Ohraničení sloupců',
      defaultValue: false,
      admin: {
        description: 'Zapnuto = vzhled karet (rámeček + pozadí).',
      },
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
        description: '1–3 sloupce. Nadpis sloupce dejte do Textu jako H2.',
        initCollapsed: true,
      },
      fields: [
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
]

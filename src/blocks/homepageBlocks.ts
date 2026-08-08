import type { Block } from 'payload'

import { additionalColorField } from '@/fields/additionalColor'
import { callToActionField } from '@/fields/cta'

export const HomepageHeroBlock: Block = {
  slug: 'hero',
  labels: {
    plural: 'Hero bloky',
    singular: 'Hero',
  },
  fields: [
    {
      name: 'segments',
      type: 'array',
      label: 'Části nadpisu',
      labels: {
        plural: 'Části',
        singular: 'Část',
      },
      minRows: 1,
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'text',
          type: 'text',
          label: 'Text',
          required: true,
        },
        additionalColorField({
          allowNone: true,
          defaultValue: '',
          label: 'Podtržení',
          name: 'underline',
        }),
      ],
    },
    {
      name: 'subheadline',
      type: 'textarea',
      label: 'Podnadpis',
    },
  ],
}

export const EventsGridBlock: Block = {
  slug: 'events',
  labels: {
    plural: 'Bloky událostí',
    singular: 'Události',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis',
      defaultValue: 'Co se děje v NaZemi',
    },
    callToActionField(),
    {
      name: 'selection',
      type: 'select',
      label: 'Výběr položek',
      defaultValue: 'auto',
      options: [
        { label: 'Automaticky (nejbližší)', value: 'auto' },
        { label: 'Ruční výběr', value: 'manual' },
      ],
    },
    {
      name: 'limit',
      type: 'number',
      label: 'Počet (auto)',
      defaultValue: 3,
      min: 3,
      max: 6,
      admin: {
        condition: (_, siblingData) => siblingData?.selection === 'auto',
        description: 'Min. 3, max. 6.',
      },
    },
    {
      name: 'items',
      type: 'relationship',
      label: 'Události',
      relationTo: 'kalendar',
      hasMany: true,
      admin: {
        condition: (_, siblingData) => siblingData?.selection === 'manual',
        description: 'Min. 3, max. 6 událostí.',
      },
      validate: (value, { siblingData }) => {
        const selection = (siblingData as { selection?: string } | undefined)?.selection
        if (selection !== 'manual') return true
        if (!Array.isArray(value) || value.length === 0) {
          return 'Vyberte alespoň 3 události.'
        }
        if (value.length < 3) return 'Vyberte alespoň 3 události.'
        if (value.length > 6) return 'Vyberte nejvýše 6 událostí.'
        return true
      },
    },
  ],
}

export const PillarsBlock: Block = {
  slug: 'pillars',
  labels: {
    plural: 'Bloky pilířů',
    singular: 'Pilíře',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis',
      defaultValue: 'O co nám jde',
    },
    callToActionField(),
    {
      name: 'pillars',
      type: 'array',
      label: 'Pilíře',
      maxRows: 3,
      labels: {
        plural: 'Pilíře',
        singular: 'Pilíř',
      },
      admin: {
        initCollapsed: true,
      },
      fields: [
        additionalColorField({
          label: 'Barva',
          name: 'color',
          required: true,
        }),
        {
          name: 'title',
          type: 'text',
          label: 'Název',
          required: true,
        },
        {
          name: 'body',
          type: 'textarea',
          label: 'Text',
          required: true,
        },
        {
          name: 'buttonLabel',
          type: 'text',
          label: 'Text tlačítka',
        },
        {
          name: 'href',
          type: 'text',
          label: 'URL tlačítka',
        },
      ],
    },
  ],
}

export const NewsGridBlock: Block = {
  slug: 'news',
  labels: {
    plural: 'Bloky aktualit',
    singular: 'Aktuality',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis',
      defaultValue: 'Aktuality',
    },
    callToActionField(),
    {
      name: 'selection',
      type: 'select',
      label: 'Výběr položek',
      defaultValue: 'auto',
      options: [
        { label: 'Automaticky (nejnovější)', value: 'auto' },
        { label: 'Ruční výběr', value: 'manual' },
      ],
    },
    {
      name: 'limit',
      type: 'number',
      label: 'Počet (auto)',
      defaultValue: 4,
      min: 4,
      max: 8,
      admin: {
        condition: (_, siblingData) => siblingData?.selection === 'auto',
        description: 'Min. 4, max. 8.',
      },
    },
    {
      name: 'items',
      type: 'relationship',
      label: 'Aktuality',
      relationTo: 'aktuality',
      hasMany: true,
      admin: {
        condition: (_, siblingData) => siblingData?.selection === 'manual',
        description: 'Min. 4, max. 8 aktualit.',
      },
      validate: (value, { siblingData }) => {
        const selection = (siblingData as { selection?: string } | undefined)?.selection
        if (selection !== 'manual') return true
        if (!Array.isArray(value) || value.length === 0) {
          return 'Vyberte alespoň 4 aktuality.'
        }
        if (value.length < 4) return 'Vyberte alespoň 4 aktuality.'
        if (value.length > 8) return 'Vyberte nejvýše 8 aktualit.'
        return true
      },
    },
  ],
}

export const ProjectsListBlock: Block = {
  slug: 'projects',
  labels: {
    plural: 'Bloky projektů',
    singular: 'Projekty',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis',
      defaultValue: 'Naše projekty',
    },
    callToActionField(),
    {
      name: 'items',
      type: 'relationship',
      label: 'Projekty',
      relationTo: 'projekty',
      hasMany: true,
      required: true,
      admin: {
        description: 'Vyberte projekty a seřaďte je přetažením.',
      },
    },
  ],
}

export const AboutBlock: Block = {
  slug: 'about',
  labels: {
    plural: 'Bloky O nás',
    singular: 'O nás',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis',
      defaultValue: 'NaZemi',
    },
    callToActionField(),
    {
      name: 'image',
      type: 'upload',
      label: 'Obrázek',
      relationTo: 'media',
    },
    {
      name: 'columns',
      type: 'array',
      label: 'Sloupce',
      maxRows: 3,
      labels: {
        plural: 'Sloupce',
        singular: 'Sloupec',
      },
      admin: {
        description: 'Max. 3 sloupce — na frontendu vždy přes celou šířku kontejneru.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Nadpis',
          required: true,
        },
        {
          name: 'body',
          type: 'textarea',
          label: 'Text',
          required: true,
        },
      ],
    },
  ],
}

export const homepageBlocks = [
  HomepageHeroBlock,
  EventsGridBlock,
  PillarsBlock,
  NewsGridBlock,
  ProjectsListBlock,
  AboutBlock,
]

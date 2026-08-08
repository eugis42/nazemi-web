import type { Field } from 'payload'

/** Extra fields on the plugin `search` collection for FE filtering and snippets. */
export const searchExtraFields = (defaultFields: Field[]): Field[] => [
  ...defaultFields,
  {
    name: 'excerpt',
    type: 'textarea',
    admin: {
      description: 'Indexovaný úryvek pro fulltext a snippety.',
      readOnly: true,
    },
    label: 'Úryvek',
  },
  {
    name: 'searchText',
    type: 'textarea',
    admin: {
      description: 'Normalizovaný text (bez diakritiky + české stemy) pro fulltextové hledání.',
      readOnly: true,
    },
    index: true,
    label: 'Hledací text',
  },
  {
    name: 'collectionSlug',
    type: 'text',
    admin: {
      position: 'sidebar',
      readOnly: true,
    },
    index: true,
    label: 'Kolekce',
  },
  {
    name: 'docSlug',
    type: 'text',
    admin: {
      position: 'sidebar',
      readOnly: true,
    },
    index: true,
    label: 'Slug dokumentu',
  },
  {
    name: 'site',
    type: 'relationship',
    admin: {
      position: 'sidebar',
      readOnly: true,
    },
    index: true,
    label: 'Web',
    relationTo: 'sites',
  },
  {
    name: 'authorName',
    type: 'text',
    admin: {
      readOnly: true,
    },
    label: 'Autor',
  },
  {
    name: 'publishedAt',
    type: 'date',
    admin: {
      date: { pickerAppearance: 'dayAndTime' },
      readOnly: true,
    },
    label: 'Datum publikace',
  },
  {
    name: 'startDate',
    type: 'date',
    admin: {
      date: { pickerAppearance: 'dayAndTime' },
      readOnly: true,
    },
    label: 'Začátek události',
  },
  {
    name: 'endDate',
    type: 'date',
    admin: {
      date: { pickerAppearance: 'dayAndTime' },
      readOnly: true,
    },
    label: 'Konec události',
  },
  {
    name: 'eventIsPast',
    type: 'checkbox',
    admin: {
      position: 'sidebar',
      readOnly: true,
    },
    label: 'Minulá událost',
  },
]

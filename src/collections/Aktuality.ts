import type { CollectionConfig } from 'payload'

import { contentCollectionAccess } from '@/access/roles'
import {
  adminDayAndTimePickerCs,
  adminDocumentTitleClass,
  authorField,
  authorNameField,
  draftStatusListCellField,
  seoFields,
  siteSidebarGroup,
  tagsListCellAdmin,
  metaTabDescription,
} from '@/fields/shared'
import { validateOptionalHref } from '@/fields/validateHref'
import { makeSlugUniqueOnDuplicate, populateSlugAndDescription } from '@/hooks/content-hooks'
import { ADMIN_NAV_SITE_CONTENT } from '@/lib/admin-nav-groups'
import { siteContentLivePreviewUrl } from '@/lib/live-preview'
import { getScopedBaseFilter } from '@/lib/site-context'

export const Aktuality = {
  slug: 'aktuality',
  access: contentCollectionAccess,
  admin: {
    baseFilter: getScopedBaseFilter({ includeCrossPostedOnMain: true }),
    defaultColumns: [
      'title',
      'authorName',
      'author',
      'tags',
      'site',
      'updatedAt',
      'publishedAt',
      '_status',
    ],
    group: ADMIN_NAV_SITE_CONTENT,
    listSearchableFields: ['title', 'slug', 'authorName'],
    livePreview: {
      url: ({ data, payload }) => siteContentLivePreviewUrl('aktuality', data, payload),
    },
    preview: (data, { req }) => siteContentLivePreviewUrl('aktuality', data, req.payload),
    useAsTitle: 'title',
  },
  defaultPopulate: {
    site: true,
    tags: true,
    author: true,
  },
  defaultSort: '-publishedAt',
  fields: [
    {
      name: 'coverImage',
      type: 'upload',
      label: 'Úvodní obrázek',
      relationTo: 'media',
      admin: {
        description: 'Náhled v přehledech a u sdílení.',
        position: 'sidebar',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      defaultValue: () => new Date().toISOString(),
      label: 'Datum publikace',
      required: true,
      admin: {
        position: 'sidebar',
        width: '100%',
        date: {
          ...adminDayAndTimePickerCs,
          // List cell: date only (picker still day+time for editing).
          displayFormat: 'd. M. yyyy',
        },
      },
    },
    {
      name: 'layout',
      type: 'select',
      label: 'Layout hlavičky',
      defaultValue: 'big',
      options: [
        { label: 'Velký hero obrázek', value: 'big' },
        { label: 'Malý obrázek', value: 'small' },
      ],
      admin: {
        description: 'Velký = obrázek na celou šířku; malý = obrázek tak, aby se vešel do hlavičky celý.',
        position: 'sidebar',
      },
    },
    {
      name: 'tags',
      type: 'relationship',
      hasMany: true,
      label: 'Témata',
      relationTo: 'tags',
      admin: {
        ...tagsListCellAdmin,
        description: 'Volitelné kategorizace v přehledech.',
        position: 'sidebar',
      },
    },
    {
      name: 'externalUrl',
      type: 'text',
      label: 'Externí URL',
      admin: {
        description:
          'Vyplníte-li, karta článku bude odkazovat na externí odkaz(↗) místo na článek na našem webu. Relativní (/…) nebo https://…',
        position: 'sidebar',
      },
      validate: validateOptionalHref,
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Obsah',
          fields: [
            {
              name: 'title',
              type: 'text',
              label: 'Název',
              required: true,
              admin: {
                className: adminDocumentTitleClass,
              },
            },
            authorNameField,
            {
              name: 'content',
              type: 'richText',
              label: 'Obsah',
              required: true,
            },
          ],
        },
        {
          label: 'Meta',
          admin: {
            description: metaTabDescription(true),
          },
          fields: [...seoFields(), authorField],
        },
      ],
    },
    siteSidebarGroup('Kde se aktualita zobrazí.'),
    draftStatusListCellField,
  ],
  hooks: {
    beforeChange: [populateSlugAndDescription],
    beforeDuplicate: [makeSlugUniqueOnDuplicate],
  },
  indexes: [
    {
      fields: ['site', 'slug'],
      unique: true,
    },
  ],
  labels: {
    plural: 'Aktuality',
    singular: 'Aktualita',
  },
  versions: {
    drafts: true,
  },
} as CollectionConfig

import type { CollectionConfig, Validate } from 'payload'

import { contentCollectionAccess } from '@/access/roles'
import {
  adminDayAndTimePickerCs,
  adminDocumentTitleClass,
  authorField,
  ctaField,
  draftStatusListCellField,
  metaTabDescription,
  seoFields,
  siteSidebarGroup,
  tagsListCellAdmin,
} from '@/fields/shared'
import { hrefFieldDescription, validateOptionalHref } from '@/fields/validateHref'
import { makeSlugUniqueOnDuplicate, populateSlugAndDescription } from '@/hooks/content-hooks'
import { ADMIN_NAV_SITE_CONTENT } from '@/lib/admin-nav-groups'
import { siteContentLivePreviewUrl } from '@/lib/live-preview'
import { getScopedBaseFilter } from '@/lib/site-context'

export const Kalendar = {
  slug: 'kalendar',
  access: contentCollectionAccess,
  admin: {
    baseFilter: getScopedBaseFilter({ includeCrossPostedOnMain: true }),
    defaultColumns: ['title', 'startDate', 'endDate', 'tags', 'location.city', 'site', '_status'],
    group: ADMIN_NAV_SITE_CONTENT,
    listSearchableFields: ['title', 'slug'],
    livePreview: {
      url: ({ data, payload }) => siteContentLivePreviewUrl('kalendar', data, payload),
    },
    preview: (data, { req }) => siteContentLivePreviewUrl('kalendar', data, req.payload),
    useAsTitle: 'title',
  },
  defaultPopulate: {
    site: true,
    tags: true,
    workshop: true,
  },
  defaultSort: '-startDate',
  fields: [
    {
      name: 'coverImage',
      type: 'upload',
      label: 'Úvodní obrázek',
      relationTo: 'media',
      admin: {
        description: 'Plakát nebo ilustrace události.',
        position: 'sidebar',
      },
    },
    {
      name: 'startDate',
      type: 'date',
      label: 'Začátek',
      required: true,
      admin: {
        position: 'sidebar',
        date: {
          ...adminDayAndTimePickerCs,
        },
        width: '100%',
      },
    },
    {
      name: 'endDate',
      type: 'date',
      label: 'Konec',
      admin: {
        position: 'sidebar',
        date: {
          ...adminDayAndTimePickerCs,
        },
        width: '100%',
      },
      validate: ((value, { siblingData }) => {
        if (value == null || value === '') return true
        const start = siblingData?.startDate
        if (!start) return true
        const endMs = new Date(value as string).getTime()
        const startMs = new Date(start as string).getTime()
        if (Number.isNaN(endMs) || Number.isNaN(startMs)) return true
        if (endMs < startMs) return 'Konec nesmí být dřív než začátek.'
        return true
      }) as Validate,
    },
    {
      name: 'tags',
      type: 'relationship',
      hasMany: true,
      label: 'Témata',
      relationTo: 'tags',
      admin: {
        ...tagsListCellAdmin,
        position: 'sidebar',
      },
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
            {
              name: 'content',
              type: 'richText',
              label: 'Obsah',
              required: true,
            },
          ],
        },
        {
          label: 'Místo a program',
          admin: {
            description: 'Lokalita, odkazy a propojení na workshop.',
          },
          fields: [
            {
              name: 'location',
              type: 'group',
              label: 'Místo',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'name',
                      type: 'text',
                      label: 'Název místa',
                      admin: { width: '50%' },
                    },
                    {
                      name: 'city',
                      type: 'text',
                      label: 'Město',
                      admin: { width: '50%' },
                    },
                  ],
                },
                {
                  name: 'address',
                  type: 'text',
                  label: 'Adresa',
                },
                {
                  name: 'venue',
                  type: 'text',
                  label: 'Venue',
                  admin: {
                    description: 'Název venue (např. Hlavní nádraží Brno).',
                  },
                },
                {
                  name: 'mapsLink',
                  type: 'text',
                  label: 'Odkaz na mapu',
                  admin: {
                    description: hrefFieldDescription,
                  },
                  validate: validateOptionalHref,
                },
              ],
            },
            {
              name: 'workshop',
              type: 'relationship',
              label: 'Propojit s workshopem',
              relationTo: 'workshopy',
              admin: {
                description:
                  'Volitelné. Zobrazit event když uživatel klikne na tlačítko "Aktuální termíny" na stránce workshopu.',
              },
            },
          ],
        },
        {
          label: 'Call to Action',
          admin: {
            description: 'Přihlášení / odkazy u události.',
          },
          fields: [ctaField('Hlavní výzvy (Přihlásit se, ...).')],
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
    siteSidebarGroup('Kde se událost zobrazí.'),
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
    plural: 'Kalendář',
    singular: 'Událost',
  },
  versions: {
    drafts: true,
  },
} as CollectionConfig

import type { CollectionConfig } from 'payload'

import { contentCollectionAccess } from '@/access/roles'
import {
  adminDocumentTitleClass,
  authorField,
  authorNameField,
  ctaField,
  draftStatusListCellField,
  excerptField,
  metaTabDescription,
  seoFields,
  siteSidebarGroup,
  tagsListCellAdmin,
} from '@/fields/shared'
import { makeSlugUniqueOnDuplicate, populateSlugAndDescription } from '@/hooks/content-hooks'
import { ADMIN_NAV_SITE_CONTENT } from '@/lib/admin-nav-groups'
import { siteContentLivePreviewUrl } from '@/lib/live-preview'
import { getScopedBaseFilter } from '@/lib/site-context'

export const Publikace = {
  slug: 'publikace',
  access: contentCollectionAccess,
  admin: {
    baseFilter: getScopedBaseFilter({ includeCrossPostedOnMain: true }),
    defaultColumns: ['title', 'authorName', 'types', 'topics', 'site', '_status'],
    group: ADMIN_NAV_SITE_CONTENT,
    listSearchableFields: ['title', 'slug', 'authorName'],
    livePreview: {
      url: ({ data, payload }) => siteContentLivePreviewUrl('publikace', data, payload),
    },
    preview: (data, { req }) => siteContentLivePreviewUrl('publikace', data, req.payload),
    useAsTitle: 'title',
  },
  defaultPopulate: {
    site: true,
    types: true,
    topics: true,
  },
  defaultSort: 'title',
  fields: [
    {
      name: 'coverImage',
      type: 'upload',
      label: 'Úvodní obrázek',
      relationTo: 'media',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'types',
      type: 'relationship',
      hasMany: true,
      label: 'Typy',
      relationTo: 'publication-types',
      admin: {
        ...tagsListCellAdmin,
        position: 'sidebar',
      },
    },
    {
      name: 'topics',
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
            authorNameField,
            excerptField,
            {
              name: 'content',
              type: 'richText',
              label: 'Obsah',
            },
          ],
        },
        {
          label: 'Call to Action',
          admin: {
            description: 'Kde koupit / odkazy u publikace.',
          },
          fields: [ctaField('Odkazy u publikace (kde koupit,...)')],
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
    siteSidebarGroup('Kde se publikace zobrazí.'),
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
    plural: 'Publikace',
    singular: 'Publikace',
  },
  versions: {
    drafts: true,
  },
} as CollectionConfig

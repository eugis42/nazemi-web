import type { CollectionConfig } from 'payload'

import { contentCollectionAccess } from '@/access/roles'
import { allBlocks } from '@/blocks/allBlocks'
import {
  adminDocumentTitleClass,
  authorField,
  ctaField,
  draftStatusListCellField,
  excerptField,
  metaTabDescription,
  seoFields,
  siteField,
  tagsListCellAdmin,
} from '@/fields/shared'
import { makeSlugUniqueOnDuplicate, populateSlugAndDescription } from '@/hooks/content-hooks'
import { ADMIN_NAV_SITE_CONTENT } from '@/lib/admin-nav-groups'
import { siteContentLivePreviewUrl } from '@/lib/live-preview'
import { getScopedBaseFilter } from '@/lib/site-context'

export const Workshopy = {
  slug: 'workshopy',
  access: contentCollectionAccess,
  admin: {
    baseFilter: getScopedBaseFilter(),
    defaultColumns: ['title', 'topics', 'duration', 'site', '_status'],
    group: ADMIN_NAV_SITE_CONTENT,
    listSearchableFields: ['title', 'slug'],
    livePreview: {
      url: ({ data, payload }) => siteContentLivePreviewUrl('workshopy', data, payload),
    },
    preview: (data, { req }) => siteContentLivePreviewUrl('workshopy', data, req.payload),
    useAsTitle: 'title',
  },
  defaultPopulate: {
    site: true,
    topics: true,
  },
  defaultSort: 'title',
  fields: [
    {
      name: 'coverImage',
      type: 'upload',
      label: 'Úvodní obrázek',
      relationTo: 'media',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'duration',
      type: 'text',
      label: 'Délka',
      admin: {
        description: 'Volný text (např. 6 hodin, 2 dny).',
        position: 'sidebar',
      },
    },
    {
      name: 'groupSize',
      type: 'text',
      label: 'Velikost skupiny',
      admin: {
        description: 'Např. 12–24 účastníků.',
        position: 'sidebar',
      },
    },
    {
      name: 'price',
      type: 'text',
      label: 'Cena',
      admin: {
        description: 'Volný text (např. 12 000 – 18 000 Kč).',
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
      name: 'audiences',
      type: 'relationship',
      hasMany: true,
      label: 'Cílové skupiny',
      relationTo: 'workshop-audiences',
      admin: {
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
            excerptField,
            {
              name: 'takeaways',
              type: 'array',
              label: 'Co si odnesete',
              labels: {
                plural: 'Body',
                singular: 'Bod',
              },
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'item',
                  type: 'text',
                  label: 'Text',
                  required: true,
                },
              ],
            },
            {
              name: 'blocks',
              type: 'blocks',
              label: 'Obsah',
              blocks: allBlocks,
              admin: {
                description: 'Univerzální bloky včetně Textového, lektorů a referencí.',
                initCollapsed: true,
              },
            },
          ],
        },
        {
          label: 'Call to Action',
          admin: {
            description: 'Objednávka / externí odkaz v hlavičce.',
          },
          fields: [ctaField('Objednávka / externí odkaz v hlavičce.')],
        },
        {
          label: 'Naplánované termíny',
          fields: [
            {
              name: 'scheduledWorkshops',
              type: 'join',
              admin: {
                defaultColumns: ['title', 'startDate', 'site'],
                description:
                  'Propojené termíny z Kalendáře (vznikají u události polem Workshop).',
              },
              collection: 'kalendar',
              label: 'Události v kalendáři',
              on: 'workshop',
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
    {
      ...siteField,
      admin: {
        ...siteField.admin,
        description: 'Na kterém webu se workshop nabízí.',
      },
    },
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
    plural: 'Workshopy',
    singular: 'Workshop',
  },
  versions: {
    drafts: true,
  },
} as CollectionConfig

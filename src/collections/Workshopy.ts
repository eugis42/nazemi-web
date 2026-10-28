import type { CollectionConfig } from 'payload'

import { contentCollectionAccess } from '@/access/roles'
import { allBlocks } from '@/blocks/allBlocks'
import {
  adminDocumentTitleClass,
  authorField,
  ctaField,
  draftStatusListCellField,
  excerptField,
  imageUploadFilter,
  metaTabDescription,
  seoFields,
  siteSidebarGroup,
  tagsListCellAdmin,
} from '@/fields/shared'
import { makeSlugUniqueOnDuplicate, populateSlugAndDescription } from '@/hooks/content-hooks'
import {
  workshopOrderAfterChange,
  workshopOrderBeforeChange,
} from '@/hooks/workshop-order'
import { ADMIN_NAV_SITE_CONTENT } from '@/lib/admin-nav-groups'
import { siteContentLivePreviewUrl } from '@/lib/live-preview'
import { validateWorkshopSiteAgainstKalendar } from '@/lib/same-site-workshop'
import { getScopedBaseFilter } from '@/lib/site-context'

export const Workshopy = {
  slug: 'workshopy',
  access: contentCollectionAccess,
  /** Drag-and-drop list order (`_order`). Cross-posts use `mainSiteOrder` on main. */
  orderable: true,
  admin: {
    baseFilter: getScopedBaseFilter({ includeCrossPostedOnMain: true }),
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
    slug: true,
    title: true,
    excerpt: true,
    coverImage: true,
    site: true,
    topics: true,
    audiences: true,
  },
  // Payload also sets this when orderable; keep explicit for FE clarity.
  defaultSort: '_order',
  fields: [
    {
      name: 'mainSiteOrder',
      type: 'text',
      index: true,
      admin: {
        description:
          'Pořadí na hlavním webu (včetně cross-postů). Mění se přetažením v seznamu na hlavním webu; pořadí na sub-webu (`_order`) nemění.',
        disableBulkEdit: true,
        disabled: true,
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'coverImage',
      type: 'upload',
      label: 'Úvodní obrázek',
      relationTo: 'media',
      filterOptions: imageUploadFilter,
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
                components: {
                  RowLabel: '/components/admin/ArrayFieldRowLabel#ArrayFieldRowLabel',
                },
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
                components: {
                  Field: '/components/admin/BlocksFieldHidePageIntro#BlocksFieldHidePageIntro',
                  RowLabel: '/components/admin/BlocksRowLabel#BlocksRowLabel',
                },
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
    siteSidebarGroup('Na kterém webu se workshop nabízí.', {
      validate: validateWorkshopSiteAgainstKalendar,
    }),
    draftStatusListCellField,
  ],
  hooks: {
    afterChange: [workshopOrderAfterChange],
    beforeChange: [populateSlugAndDescription, workshopOrderBeforeChange],
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

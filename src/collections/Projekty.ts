import type { CollectionConfig } from 'payload'

import { contentCollectionAccess } from '@/access/roles'
import { allBlocks } from '@/blocks/allBlocks'
import { additionalColorField } from '@/fields/additionalColor'
import { adminDocumentTitleClass, ctaField, draftStatusListCellField, excerptField, metaTabDescription, seoFields } from '@/fields/shared'
import { lockProjectsToMainSite, makeSlugUniqueOnDuplicate, populateSlugAndDescription } from '@/hooks/content-hooks'
import { ADMIN_NAV_SITE_CONTENT } from '@/lib/admin-nav-groups'
import { siteContentLivePreviewUrl } from '@/lib/live-preview'
import { MAIN_SITE_SLUG, getScopedBaseFilter } from '@/lib/site-context'

export const Projekty = {
  slug: 'projekty',
  access: contentCollectionAccess,
  admin: {
    baseFilter: getScopedBaseFilter({ allowMainSiteOnly: true }),
    defaultColumns: ['title', 'site', '_status'],
    group: ADMIN_NAV_SITE_CONTENT,
    listSearchableFields: ['title', 'slug'],
    livePreview: {
      url: ({ data, payload }) => siteContentLivePreviewUrl('projekty', data, payload),
    },
    preview: (data, { req }) => siteContentLivePreviewUrl('projekty', data, req.payload),
    useAsTitle: 'title',
  },
  defaultSort: 'title',
  fields: [
    {
      name: 'logo',
      type: 'upload',
      label: 'Logo',
      relationTo: 'media',
      admin: {
        description: 'Značka projektu v přehledech.',
        position: 'sidebar',
      },
    },
    {
      ...additionalColorField({
        label: 'Barva projektu',
        name: 'projectColor',
      }),
      admin: {
        ...additionalColorField({ name: 'projectColor' }).admin,
        description: 'Barva pruhu v přehledu a detailu (Doplňkové barvy webu).',
        position: 'sidebar',
      },
    },
    {
      name: 'logoClass',
      type: 'text',
      label: 'CSS třída loga',
      admin: {
        description: 'Tailwind třídy velikosti loga, např. h-[95px] w-[150px].',
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
              name: 'content',
              type: 'blocks',
              label: 'Obsah',
              blocks: allBlocks,
              required: true,
              admin: {
                description: 'Univerzální bloky (včetně Textového a galerie).',
                initCollapsed: true,
              },
            },
          ],
        },
        {
          label: 'Call to Action',
          admin: {
            description: 'Odkazy u projektu (web, detail, …).',
          },
          fields: [ctaField('Odkazy u projektu.', { withVariant: true })],
        },
        {
          label: 'Meta',
          admin: {
            description: metaTabDescription(false),
          },
          fields: seoFields(),
        },
      ],
    },
    {
      name: 'site',
      type: 'relationship',
      admin: {
        description: 'Projekty jsou vázané na hlavní web.',
        position: 'sidebar',
        readOnly: true,
      },
      label: 'Web',
      relationTo: 'sites',
      required: true,
    },
    draftStatusListCellField,
  ],
  hooks: {
    beforeChange: [
      lockProjectsToMainSite,
      async (args) => {
        const nextData = await populateSlugAndDescription(args)
        const mainSite = await args.req.payload.find({
          collection: 'sites',
          depth: 0,
          limit: 1,
          pagination: false,
          where: {
            slug: {
              equals: MAIN_SITE_SLUG,
            },
          },
        })

        if (mainSite.docs[0]?.id) {
          return {
            ...nextData,
            site: mainSite.docs[0].id,
          }
        }

        return nextData
      },
    ],
    beforeDuplicate: [makeSlugUniqueOnDuplicate],
  },
  indexes: [
    {
      fields: ['site', 'slug'],
      unique: true,
    },
  ],
  labels: {
    plural: 'Projekty',
    singular: 'Projekt',
  },
  versions: {
    drafts: true,
  },
} as CollectionConfig

import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { contentCollectionAccess } from '@/access/roles'
import { allBlocks } from '@/blocks/allBlocks'
import { additionalColorField } from '@/fields/additionalColor'
import {
  adminDocumentTitleClass,
  draftStatusListCellField,
  excerptField,
  metaTabDescription,
  seoFields,
  siteField,
} from '@/fields/shared'
import { makeSlugUniqueOnDuplicate, populateSlugAndDescription } from '@/hooks/content-hooks'
import { ADMIN_NAV_SITE_CONTENT } from '@/lib/admin-nav-groups'
import { siteContentLivePreviewUrl } from '@/lib/live-preview'
import { getScopedBaseFilter } from '@/lib/site-context'

const ensureSingleHomepagePerSite: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const nextData = { ...(data || {}) }
  if (!nextData.isHomepage) {
    return nextData
  }

  const siteId = nextData.site ?? originalDoc?.site
  if (!siteId) {
    return nextData
  }

  const siteRef = typeof siteId === 'object' && siteId !== null && 'id' in siteId ? siteId.id : siteId
  const currentId = originalDoc?.id

  const others = await req.payload.find({
    collection: 'stranky',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        { site: { equals: siteRef } },
        { isHomepage: { equals: true } },
        ...(currentId
          ? [
              {
                id: {
                  not_equals: currentId,
                },
              },
            ]
          : []),
      ],
    },
  })

  for (const doc of others.docs) {
    const existingContent = Array.isArray(doc.content) ? doc.content : []
    const homepageContent = Array.isArray(doc.homepageContent) ? doc.homepageContent : []
    // Avoid blank public pages after demotion: copy homepage blocks into page content when empty.
    const demoteData =
      existingContent.length === 0 && homepageContent.length > 0
        ? { isHomepage: false as const, content: homepageContent }
        : { isHomepage: false as const }

    await req.payload.update({
      id: doc.id,
      collection: 'stranky',
      data: demoteData,
      overrideAccess: true,
      req,
      context: { skipHomepageGuard: true },
    })
  }

  return nextData
}

export const Stranky = {
  slug: 'stranky',
  access: contentCollectionAccess,
  admin: {
    baseFilter: getScopedBaseFilter(),
    defaultColumns: ['title', 'site', '_status'],
    group: ADMIN_NAV_SITE_CONTENT,
    listSearchableFields: ['title', 'slug'],
    livePreview: {
      url: ({ data, payload }) => siteContentLivePreviewUrl('stranky', data, payload),
    },
    preview: (data, { req }) => siteContentLivePreviewUrl('stranky', data, req.payload),
    useAsTitle: 'title',
  },
  defaultSort: ['-isHomepage', 'title'],
  fields: [
    {
      name: 'coverImage',
      type: 'upload',
      label: 'Úvodní obrázek',
      relationTo: 'media',
      admin: {
        condition: (_, siblingData) => !siblingData?.isHomepage,
        position: 'sidebar',
      },
    },
    {
      ...additionalColorField({
        allowNone: true,
        label: 'Barva hlavičky',
        name: 'headerColor',
      }),
      admin: {
        ...additionalColorField({ allowNone: true, name: 'headerColor' }).admin,
        condition: (_, siblingData) => !siblingData?.isHomepage,
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
              ...excerptField,
              admin: {
                ...excerptField.admin,
                condition: (_, siblingData) => !siblingData?.isHomepage,
              },
            },
            {
              name: 'content',
              type: 'blocks',
              blocks: allBlocks,
              label: 'Obsah stránky',
              labels: {
                plural: 'bloky',
                singular: 'blok',
              },
              admin: {
                condition: (_, siblingData) => !siblingData?.isHomepage,
                description: 'Univerzální bloky',
                initCollapsed: true,
                components: {
                  RowLabel: '/components/admin/BlocksRowLabel#BlocksRowLabel',
                },
              },
              validate: (value, { data }) => {
                const doc = data as { isHomepage?: boolean } | undefined
                if (!doc?.isHomepage && (!value || !Array.isArray(value) || value.length === 0)) {
                  return 'Obsah stránky je povinný.'
                }
                return true
              },
            },
            {
              name: 'homepageContent',
              type: 'blocks',
              blocks: allBlocks,
              label: 'Obsah homepage',
              labels: {
                plural: 'bloky',
                singular: 'blok',
              },
              admin: {
                condition: (_, siblingData) => Boolean(siblingData?.isHomepage),
                description: 'Univerzální bloky domovské stránky',
                initCollapsed: true,
                components: {
                  RowLabel: '/components/admin/BlocksRowLabel#BlocksRowLabel',
                },
              },
              validate: (value, { data }) => {
                const doc = data as { isHomepage?: boolean } | undefined
                if (doc?.isHomepage && (!value || !Array.isArray(value) || value.length === 0)) {
                  return 'Obsah homepage je povinný.'
                }
                return true
              },
            },
          ],
        },
        {
          label: 'Meta',
          admin: {
            description: metaTabDescription(false),
          },
          fields: [
            {
              name: 'isHomepage',
              type: 'checkbox',
              label: 'Domovská stránka',
              admin: {
                description: 'Na každém webu může být jen jedna domovská stránka.',
                components: {
                  Field: '/components/admin/IsHomepageField#IsHomepageField',
                },
              },
            },
            ...seoFields(),
          ],
        },
      ],
    },
    {
      ...siteField,
      admin: {
        ...siteField.admin,
        description: 'Web, na kterém se stránka zobrazí.',
      },
    },
    draftStatusListCellField,
  ],
  hooks: {
    beforeChange: [
      async (args) => {
        if (args.context?.skipHomepageGuard) {
          return args.data
        }
        return ensureSingleHomepagePerSite(args)
      },
      populateSlugAndDescription,
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
    plural: 'Stránky',
    singular: 'Stránka',
  },
  versions: {
    drafts: true,
  },
} as CollectionConfig

import type { CollectionConfig } from 'payload'

import { contentCollectionAccess } from '@/access/roles'
import { adminDocumentTitleClass, draftStatusListCellField, siteField, uploadPreviewListCellAdmin } from '@/fields/shared'
import { makeSlugUniqueOnDuplicate } from '@/hooks/content-hooks'
import { ADMIN_NAV_SITE_CONTENT } from '@/lib/admin-nav-groups'
import { getAdminSiteSlugFromRequest } from '@/lib/site-context'
import { getScopedBaseFilter } from '@/lib/site-context'
import { slugify } from '@/lib/slug'

export const Lide = {
  slug: 'lide',
  access: contentCollectionAccess,
  admin: {
    baseFilter: getScopedBaseFilter(),
    defaultColumns: ['name', 'image', 'role', 'site', '_status'],
    group: ADMIN_NAV_SITE_CONTENT,
    listSearchableFields: ['name', 'role', 'email'],
    useAsTitle: 'name',
  },
  defaultPopulate: {
    site: true,
  },
  defaultSort: 'name',
  fields: [
    {
      name: 'image',
      type: 'upload',
      label: 'Fotografie',
      relationTo: 'media',
      admin: {
        ...uploadPreviewListCellAdmin,
        position: 'sidebar',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Pořadí',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'name',
      type: 'text',
      label: 'Jméno',
      required: true,
      admin: {
        className: adminDocumentTitleClass,
      },
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Slug',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Vygeneruje se ze jména při prvním uložení.',
      },
    },
    {
      name: 'role',
      type: 'text',
      label: 'Role',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'phone',
          type: 'text',
          label: 'Telefon',
          admin: { width: '50%' },
        },
        {
          name: 'email',
          type: 'email',
          label: 'E-mail',
          admin: { width: '50%' },
        },
      ],
    },
    {
      ...siteField,
      admin: {
        ...siteField.admin,
        description: 'Web, na kterém se osoba zobrazí v kontaktech.',
      },
    },
    draftStatusListCellField,
  ],
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        const nextData = { ...(data || {}) } as Record<string, unknown>

        if (!nextData.slug && typeof nextData.name === 'string' && nextData.name) {
          nextData.slug = slugify(nextData.name)
        }

        if (!nextData.site) {
          const activeSiteSlug = getAdminSiteSlugFromRequest(req)
          const siteResult = await req.payload.find({
            collection: 'sites',
            depth: 0,
            limit: 1,
            pagination: false,
            where: {
              slug: {
                equals: activeSiteSlug,
              },
            },
          })

          if (siteResult.docs[0]?.id) {
            nextData.site = siteResult.docs[0].id
          }
        }

        return nextData
      },
    ],
    beforeDuplicate: [
      async ({ data }: { data: Partial<Record<string, unknown>> }) => {
        const next = await makeSlugUniqueOnDuplicate({ data })
        if (typeof next.name === 'string') {
          return {
            ...next,
            name: next.name.includes('(kopie)') ? next.name : `${next.name} (kopie)`,
          }
        }
        return next
      },
    ],
  },
  indexes: [
    {
      fields: ['site', 'slug'],
      unique: true,
    },
  ],
  labels: {
    plural: 'Lidé',
    singular: 'Člověk',
  },
  versions: {
    drafts: true,
  },
} as CollectionConfig

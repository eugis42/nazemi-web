import type { CollectionConfig } from 'payload'

import { contentCollectionAccess } from '@/access/roles'
import { slugField } from '@/fields/shared'
import { ADMIN_NAV_TAGS } from '@/lib/admin-nav-groups'

const buildSimpleTaxonomyCollection = ({
  labels,
  plural,
  singular,
  slug,
}: {
  labels: string
  plural: string
  singular: string
  slug: string
}): CollectionConfig => ({
  slug,
  access: contentCollectionAccess,
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    group: ADMIN_NAV_TAGS,
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: labels,
      required: true,
    },
    slugField(),
  ],
  labels: {
    plural,
    singular,
  },
})

export const Tags = buildSimpleTaxonomyCollection({
  labels: 'Název',
  plural: 'Témata',
  singular: 'Téma',
  slug: 'tags',
})

export const WorkshopAudiences = buildSimpleTaxonomyCollection({
  labels: 'Název',
  plural: 'Workshopy: Cílové skupiny',
  singular: 'Workshopy: Cílová skupina',
  slug: 'workshop-audiences',
})

export const PublicationTypes = buildSimpleTaxonomyCollection({
  labels: 'Název',
  plural: 'Publikace: Typy',
  singular: 'Publikace: Typ',
  slug: 'publication-types',
})

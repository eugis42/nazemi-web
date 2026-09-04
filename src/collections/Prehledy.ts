import type { CollectionConfig } from 'payload'

import { contentCollectionAccess } from '@/access/roles'
import {
  COLLECTION_HOME_KEYS,
  collectionHomeTitle,
} from '@/lib/collection-homes'


/**
 * Selectable “collection home” targets for menu internal links
 * (Aktuality / Kalendář / … listing URLs). Hidden from admin nav; auto-created per site.
 */
export const Prehledy: CollectionConfig = {
  slug: 'prehledy',
  access: contentCollectionAccess,
  admin: {
    hidden: true,
    useAsTitle: 'title',
  },
  labels: {
    plural: 'Přehledy',
    singular: 'Přehled',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Název',
      required: true,
      admin: {
        description: 'Text v menu, pokud položka nemá vlastní popisek.',
      },
    },
    {
      name: 'collectionKey',
      type: 'select',
      label: 'Kolekce',
      required: true,
      options: COLLECTION_HOME_KEYS.map((value) => ({
        label: collectionHomeTitle(value),
        value,
      })),
    },
    {
      name: 'site',
      type: 'relationship',
      label: 'Web',
      relationTo: 'sites',
      required: true,
      admin: {
        description: 'Web, ke kterému přehled patří.',
      },
    },
  ],
  timestamps: false,
}

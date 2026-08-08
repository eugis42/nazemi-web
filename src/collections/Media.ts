import type { CollectionConfig } from 'payload'
import path from 'path'

import { mediaAccess } from '@/access/roles'
import { ADMIN_NAV_SHARED_SETTINGS } from '@/lib/admin-nav-groups'

export const Media: CollectionConfig = {
  slug: 'media',
  access: mediaAccess,
  admin: {
    defaultColumns: ['filename', 'alt', 'updatedAt'],
    group: ADMIN_NAV_SHARED_SETTINGS,
    useAsTitle: 'alt',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alternativní text',
      required: true,
      admin: {
        description: 'Popis obrázku pro přístupnost a SEO.',
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Popisek',
      admin: {
        description: 'Volitelný popisek u obrázku v obsahu.',
      },
    },
  ],
  labels: {
    plural: 'Média',
    singular: 'Médium',
  },
  upload: {
    // cwd/media — gitignored; Docker bind/volume on VPS (docker-compose.prod.yml).
    staticDir: path.resolve(process.cwd(), 'media'),
    imageSizes: [
      {
        height: 768,
        name: 'card',
        width: 1365,
      },
    ],
  },
}

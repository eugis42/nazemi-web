import type { CollectionConfig } from 'payload'

import { usersAccess } from '@/access/roles'
import { ADMIN_NAV_SHARED_SETTINGS } from '@/lib/admin-nav-groups'

export const Users: CollectionConfig = {
  slug: 'users',
  access: usersAccess,
  admin: {
    defaultColumns: ['name', 'email', 'role'],
    group: ADMIN_NAV_SHARED_SETTINGS,
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Jméno',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'editor',
      label: 'Role',
      options: [
        {
          label: 'Administrátor',
          value: 'admin',
        },
        {
          label: 'Editor',
          value: 'editor',
        },
      ],
      required: true,
      access: {
        update: ({ req }) => (req.user as { role?: string } | null)?.role === 'admin',
      },
      admin: {
        description: 'Administrátor spravuje weby a uživatele; editor spravuje obsah.',
      },
    },
  ],
  labels: {
    plural: 'Uživatelé',
    singular: 'Uživatel',
  },
}

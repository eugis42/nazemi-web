import type { CollectionConfig } from 'payload'

import { usersAccess } from '@/access/roles'
import { ADMIN_NAV_ADMINISTRATION } from '@/lib/admin-nav-groups'

export const Users: CollectionConfig = {
  slug: 'users',
  access: usersAccess,
  admin: {
    defaultColumns: ['name', 'email', 'role'],
    group: ADMIN_NAV_ADMINISTRATION,
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
        description:
          'Administrátor = weby, nastavení webu, uživatelé, vyhledávání. Editor = obsah, média, kategorizace. Víc administrátorů je v pořádku.',
      },
      saveToJWT: true,
    },
  ],
  labels: {
    plural: 'Uživatelé',
    singular: 'Uživatel',
  },
}

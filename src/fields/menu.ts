import type { Field, Validate } from 'payload'

import { hrefFieldDescription, hrefFormatError } from '@/fields/validateHref'

export const NAV_LINK_COLLECTIONS = [
  'stranky',
  'aktuality',
  'kalendar',
  'workshopy',
  'publikace',
  'projekty',
] as const

const validateInternalReference: Validate = (value, { siblingData }) => {
  if (siblingData?.linkType !== 'internal') return true
  if (value == null || value === '') return 'Vyberte položku pro interní odkaz.'
  if (typeof value === 'object' && 'value' in value && (value as { value?: unknown }).value == null) {
    return 'Vyberte položku pro interní odkaz.'
  }
  return true
}

const validateExternalHref: Validate = (value, { siblingData }) => {
  if (siblingData?.linkType === 'internal') return true
  if (typeof value !== 'string' || !value.trim()) return 'Zadejte URL pro externí odkaz.'
  return hrefFormatError(value) || true
}

/** Shared nav item fields (Sites mainMenu / secondaryMenu / children). */
export function menuItemFields(options?: { allowChildren?: boolean }): Field[] {
  const fields: Field[] = [
    {
      name: 'label',
      type: 'text',
      label: 'Text',
      admin: {
        description: 'Volitelné u interního odkazu — prázdné → název vybrané položky.',
      },
    },
    {
      name: 'linkType',
      type: 'select',
      label: 'Typ odkazu',
      defaultValue: 'external',
      required: true,
      options: [
        { label: 'Interní (kolekce → položka)', value: 'internal' },
        { label: 'Externí URL', value: 'external' },
      ],
    },
    {
      name: 'reference',
      type: 'relationship',
      label: 'Položka',
      relationTo: [...NAV_LINK_COLLECTIONS],
      admin: {
        condition: (_, siblingData) => siblingData?.linkType === 'internal',
        description: 'Vyberte kolekci a záznam.',
      },
      validate: validateInternalReference,
    },
    {
      name: 'href',
      type: 'text',
      label: 'URL',
      admin: {
        condition: (_, siblingData) => siblingData?.linkType !== 'internal',
        description: hrefFieldDescription,
      },
      validate: validateExternalHref,
    },
  ]

  if (options?.allowChildren) {
    fields.push({
      name: 'children',
      type: 'array',
      label: 'Podpoložky',
      labels: {
        plural: 'Podpoložky',
        singular: 'podpoložku',
      },
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '/components/admin/MenuItemRowLabel#MenuItemRowLabel',
        },
      },
      fields: menuItemFields({ allowChildren: false }),
    })
  }

  return fields
}

export const menuArrayAdmin = {
  initCollapsed: true,
  components: {
    RowLabel: '/components/admin/MenuItemRowLabel#MenuItemRowLabel',
  },
} as const

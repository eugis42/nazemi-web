import type { Field, Validate } from 'payload'

import { hrefFieldDescription, hrefFormatError } from '@/fields/validateHref'
import { menuReferenceFilterOptions } from '@/lib/collection-homes'

export const NAV_LINK_COLLECTIONS = [
  'prehledy',
  'stranky',
  'aktuality',
  'kalendar',
  'workshopy',
  'publikace',
  'projekty',
  'forms',
] as const

function siblingCtaLabel(siblingData: Record<string, unknown> | undefined): string {
  for (const key of ['label', 'buttonLabel', 'title', 'subscribeLabel'] as const) {
    const v = siblingData?.[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

const validateInternalReference: Validate = (value, { siblingData }) => {
  if (siblingData?.linkType !== 'internal') return true
  const emptyRef =
    value == null ||
    value === '' ||
    (typeof value === 'object' &&
      value !== null &&
      'value' in value &&
      (value as { value?: unknown }).value == null)
  // Optional CTAs (pilíře, donate) — no label + no ref = unused row.
  if (emptyRef && !siblingCtaLabel(siblingData as Record<string, unknown>)) return true
  if (emptyRef) return 'Vyberte položku pro interní odkaz.'
  return true
}

const validateExternalHref: Validate = (value, { siblingData }) => {
  if (siblingData?.linkType === 'internal') return true
  // Legacy: doc CTAs used `url`; newsletters used `subscribeUrl`.
  const data = siblingData as Record<string, unknown> | undefined
  const legacy =
    (typeof data?.url === 'string' && data.url.trim()) ||
    (typeof data?.subscribeUrl === 'string' && data.subscribeUrl.trim()) ||
    ''
  const href = typeof value === 'string' && value.trim() ? value.trim() : legacy
  if (!href) {
    if (!siblingCtaLabel(data)) return true
    return 'Zadejte URL pro externí odkaz.'
  }
  return hrefFormatError(href) || true
}

type NavLinkOptions = {
  compactDbNames?: boolean
  /** When true, omit linkType (caller already placed it in a row). */
  skipLinkType?: boolean
}

/** Interní stránka/záznam vs URL — menu items + block CTAs. */
export function navLinkTargetFields(options?: NavLinkOptions): Field[] {
  const compact = Boolean(options?.compactDbNames)
  const fields: Field[] = []

  if (!options?.skipLinkType) {
    fields.push({
      name: 'linkType',
      type: 'select',
      label: 'Typ odkazu',
      defaultValue: 'external',
      required: true,
      ...(compact
        ? {
            // Deep block nests otherwise exceed PG 63-char enum limit.
            dbName: ({ tableName }: { tableName?: string }) => `${tableName || 'cta'}_lt`,
          }
        : {}),
      options: [
        { label: 'Interní', value: 'internal' },
        { label: 'Zadat URL', value: 'external' },
      ],
    })
  }

  fields.push(
    {
      name: 'reference',
      type: 'relationship',
      label: 'Položka',
      relationTo: [...NAV_LINK_COLLECTIONS],
      ...(compact
        ? {
            dbName: ({ tableName }: { tableName?: string }) => `${tableName || 'cta'}_ref`,
          }
        : {}),
      filterOptions: async ({ data, relationTo, req }) =>
        menuReferenceFilterOptions({
          data: data as Record<string, unknown> | null,
          relationTo: typeof relationTo === 'string' ? relationTo : undefined,
          req,
        }),
      admin: {
        condition: (_, siblingData) => siblingData?.linkType === 'internal',
        description:
          'Přehled kolekce, stránka, záznam obsahu — nebo formulář (otevře modal).',
        sortOptions: {
          aktuality: '-publishedAt',
          kalendar: 'startDate',
        },
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
  )

  return fields
}

type MenuItemFieldOptions = {
  /** Flat tree storage for mainMenu (0 = top, 1 = podpoložka). */
  withDepth?: boolean
}

/** Shared nav item fields (Sites mainMenu / secondaryMenu). */
export function menuItemFields(options?: MenuItemFieldOptions): Field[] {
  const fields: Field[] = []

  if (options?.withDepth) {
    fields.push({
      name: 'depth',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 1,
      admin: {
        hidden: true,
      },
    })
  }

  fields.push(
    {
      type: 'row',
      fields: [
        {
          name: 'label',
          type: 'text',
          label: 'Text',
          admin: {
            description: 'Volitelné u interního odkazu — prázdné → název vybrané položky.',
            width: '60%',
          },
        },
        {
          name: 'linkType',
          type: 'select',
          label: 'Typ odkazu',
          defaultValue: 'external',
          required: true,
          options: [
            { label: 'Interní', value: 'internal' },
            { label: 'Zadat URL', value: 'external' },
          ],
          admin: { width: '40%' },
        },
      ],
    },
    ...navLinkTargetFields({ skipLinkType: true }),
  )

  return fields
}

export const menuArrayAdmin = {
  initCollapsed: true,
  components: {
    RowLabel: '/components/admin/MenuItemRowLabel#MenuItemRowLabel',
  },
} as const

export const mainMenuArrayAdmin = {
  initCollapsed: true,
  components: {
    Field: '/components/admin/MenuTreeField#MenuTreeField',
    RowLabel: '/components/admin/MenuItemRowLabel#MenuItemRowLabel',
  },
} as const

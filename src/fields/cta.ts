import type { Field } from 'payload'

import { additionalColorField } from '@/fields/additionalColor'
import { navLinkTargetFields } from '@/fields/menu'

/** CTA button look: Plné / Obrys / Barevné (accent fill + primary outline). */
export const ctaVariantOptions = [
  { label: 'Plné', value: 'filled' },
  { label: 'Obrys', value: 'outline' },
  { label: 'Barevné', value: 'colored' },
] as const

export type CtaVariant = (typeof ctaVariantOptions)[number]['value']

/** Variant select + optional accent background (Barevné). Stacked so variant stays full-width when colour is hidden. */
export function ctaVariantFields(): Field[] {
  return [
    {
      name: 'variant',
      type: 'select',
      label: 'Varianta',
      defaultValue: 'outline',
      options: [...ctaVariantOptions],
    },
    {
      ...additionalColorField({
        allowNone: true,
        label: 'Barva pozadí',
        name: 'backgroundColor',
      }),
      admin: {
        ...additionalColorField({ allowNone: true, name: 'backgroundColor' }).admin,
        condition: (_, siblingData) => siblingData?.variant === 'colored',
        description: 'Pozadí z doplňkových barev webu. Obrys a text = primární barva.',
      },
    },
  ]
}

/**
 * Shared “Call to Action” array — max 2 buttons (Události, Pilíře, Aktuality, Projekty, O nás).
 * Link target = same fields/UI as Navigace (linkType + reference / href).
 */
export const callToActionField = (overrides?: Partial<Field>): Field =>
  ({
    name: 'actions',
    type: 'array',
    label: 'Call to Action',
    labels: {
      plural: 'Tlačítka',
      singular: 'Tlačítko',
    },
    maxRows: 2,
    admin: {
      components: {
        RowLabel: '/components/admin/MenuItemRowLabel#MenuItemRowLabel',
      },
      description: 'Max. 2 tlačítka',
      initCollapsed: true,
    },
    fields: [
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
            // Deep block nests otherwise exceed PG 63-char enum limit.
            dbName: ({ tableName }: { tableName?: string }) => `${tableName || 'cta'}_lt`,
            options: [
              { label: 'Interní', value: 'internal' },
              { label: 'Zadat URL', value: 'external' },
            ],
            admin: { width: '40%' },
          },
        ],
      },
      ...navLinkTargetFields({ compactDbNames: true, skipLinkType: true }),
      ...ctaVariantFields(),
    ],
    ...overrides,
  }) as Field

/** Optional single CTA — one per column in 3 sloupce / 3 karty. */
export const columnCallToActionField = (): Field =>
  callToActionField({
    admin: {
      components: {
        RowLabel: '/components/admin/MenuItemRowLabel#MenuItemRowLabel',
      },
      description: 'Volitelné, max. 1 tlačítko',
      initCollapsed: true,
    },
    maxRows: 1,
  })

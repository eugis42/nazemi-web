import type { Field } from 'payload'

import { hrefFieldDescription, validateRequiredHref } from '@/fields/validateHref'

/** CTA button look: Plné = earth fill / sky text; Obrys = sky fill / earth border+text. */
export const ctaVariantOptions = [
  { label: 'Plné', value: 'filled' },
  { label: 'Obrys', value: 'outline' },
] as const

export type CtaVariant = (typeof ctaVariantOptions)[number]['value']

/**
 * Shared “Call to Action” array — max 2 buttons (Události, Pilíře, Aktuality, Projekty, O nás).
 * External links: no checkbox — FE auto-detects from href.
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
      description: 'Max. 2 tlačítka',
      initCollapsed: true,
    },
    fields: [
      {
        name: 'label',
        type: 'text',
        label: 'Text',
        required: true,
      },
      {
        name: 'href',
        type: 'text',
        label: 'URL',
        required: true,
        admin: {
          description: hrefFieldDescription,
        },
        validate: validateRequiredHref,
      },
      {
        name: 'variant',
        type: 'select',
        label: 'Varianta',
        defaultValue: 'outline',
        options: [...ctaVariantOptions],
      },
    ],
    ...overrides,
  }) as Field

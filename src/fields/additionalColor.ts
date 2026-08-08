import type { Field, TextField } from 'payload'

type AdditionalColorFieldArgs = {
  /** When true (default for optional fields), offer „Žádná“ and store blank. */
  allowNone?: boolean
  defaultValue?: string
  label?: TextField['label']
  name: string
  required?: boolean
}

/**
 * Colour pick from the active site’s Doplňkové barvy (admin cookie).
 * Dropdown; blank / „Žádná“ = no colour applied on the frontend.
 */
export const additionalColorField = ({
  allowNone,
  defaultValue,
  label = 'Barva',
  name,
  required = false,
}: AdditionalColorFieldArgs): TextField => {
  const noneAllowed = allowNone ?? !required

  return {
    name,
    type: 'text',
    label,
    required,
    defaultValue: noneAllowed ? (defaultValue ?? '') : defaultValue,
    admin: {
      components: {
        Field: '/components/admin/AdditionalColorSelect#AdditionalColorSelect',
      },
      custom: {
        allowNone: noneAllowed,
      },
    },
  }
}

/** Optional wrapper when a plain Field union is needed. */
export const additionalColorFieldAsField = (args: AdditionalColorFieldArgs): Field =>
  additionalColorField(args)

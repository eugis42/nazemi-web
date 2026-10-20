import type { Block, Field } from 'payload'

import { fields as formBuilderFields } from '@payloadcms/plugin-form-builder'

const LABEL_OVERRIDES: Record<string, { singular: string; plural: string }> = {
  message: { singular: 'Textový blok', plural: 'Textové bloky' },
  select: { singular: 'Výběr z menu (Dropdown)', plural: 'Výběry z menu' },
  text: { singular: 'Textové pole', plural: 'Textová pole' },
  textarea: { singular: 'Dlouhé textové pole', plural: 'Dlouhá textová pole' },
  radio: {
    singular: 'Výběr z možností (Radio button)',
    plural: 'Výběry z možností',
  },
}

const POPIS_FIELD: Field = {
  name: 'description',
  type: 'textarea',
  label: 'Popis',
  localized: true,
  admin: {
    description: 'Zobrazí se pod štítkem na webu.',
    rows: 2,
  },
}

/**
 * Strip layout width, hide machine `name` / option `value` (filled on save from labels),
 * inject Popis, pack fields into full-width / sensible shared rows.
 */
export function simplifyFormFieldBlock(block: Block): Block {
  const cleaned = ensurePopis(simplifyFields(block.fields), block.slug)
  return {
    ...block,
    fields: layoutFormFields(cleaned),
  }
}

function withLabels(block: Block, key: string): Block {
  const labels = LABEL_OVERRIDES[key]
  if (!labels) return block
  return { ...block, labels }
}

function ensurePopis(fields: Field[], slug?: string): Field[] {
  if (slug === 'message') return fields
  if (fields.some((f) => named(f) === 'description')) return fields
  return [...fields, POPIS_FIELD]
}

function simplifyFields(fields: Field[]): Field[] {
  const out: Field[] = []

  for (const field of fields) {
    if ('name' in field && field.name === 'width') continue

    if (field.type === 'row' && Array.isArray(field.fields)) {
      const inner = simplifyFields(field.fields)
      if (!inner.length) continue
      out.push(...inner)
      continue
    }

    if ('name' in field && field.name === 'name' && field.type === 'text') {
      out.push({
        ...field,
        required: false,
        admin: {
          ...('admin' in field ? field.admin : undefined),
          hidden: true,
        },
      })
      continue
    }

    if ('name' in field && field.name === 'value' && field.type === 'text') {
      out.push({
        ...field,
        required: false,
        admin: {
          ...('admin' in field ? field.admin : undefined),
          hidden: true,
        },
      })
      continue
    }

    if (field.type === 'array' && field.name === 'options' && Array.isArray(field.fields)) {
      out.push({
        ...field,
        fields: simplifyFields(field.fields),
        admin: {
          ...field.admin,
          components: {
            ...field.admin?.components,
            RowLabel: '/components/admin/FormOptionRowLabel#FormOptionRowLabel',
          },
        },
      })
      continue
    }

    out.push(field)
  }

  return out
}

function named(field: Field): string | null {
  return 'name' in field && typeof field.name === 'string' ? field.name : null
}

function withWidth(field: Field, width: string): Field {
  if (!('admin' in field) && field.type === 'row') return field
  return {
    ...field,
    admin: {
      ...('admin' in field ? field.admin : undefined),
      width,
    },
  } as Field
}

/**
 * Rebuild admin layout:
 * - label + popis full width
 * - pair defaultValue | placeholder when both exist
 * - trailing checkboxes share a row when 2+ (never beside label)
 */
function layoutFormFields(fields: Field[]): Field[] {
  const hidden: Field[] = []
  const checks: Field[] = []
  const rest: Field[] = []

  for (const field of fields) {
    const n = named(field)
    if (n === 'name' || n === 'value') {
      hidden.push(field)
      continue
    }
    if (field.type === 'checkbox') {
      checks.push(field)
      continue
    }
    rest.push(field)
  }

  const out: Field[] = [...hidden]
  const byName = new Map<string, Field>()
  for (const field of rest) {
    const n = named(field)
    if (n) byName.set(n, field)
  }

  const take = (key: string) => {
    const field = byName.get(key)
    if (field) byName.delete(key)
    return field
  }

  const label = take('label')
  if (label) out.push(withWidth(label, '100%'))

  const description = take('description')
  if (description) out.push(withWidth(description, '100%'))

  const message = take('message')
  if (message) out.push(message)

  const defaultValue = take('defaultValue')
  const placeholder = take('placeholder')
  if (defaultValue && placeholder) {
    out.push({
      type: 'row',
      fields: [withWidth(defaultValue, '50%'), withWidth(placeholder, '50%')],
    })
  } else {
    if (defaultValue) out.push(withWidth(defaultValue, '100%'))
    if (placeholder) out.push(withWidth(placeholder, '100%'))
  }

  const options = take('options')
  if (options) out.push(options)

  for (const field of byName.values()) {
    out.push(withWidth(field, '100%'))
  }

  if (checks.length >= 2) {
    const width = `${Math.floor(100 / checks.length)}%`
    out.push({
      type: 'row',
      fields: checks.map((c) => withWidth(c, width)),
    })
  } else if (checks.length === 1) {
    out.push(withWidth(checks[0]!, '100%'))
  }

  return out
}

/**
 * Custom Form Builder block — frontend loads published workshopy for the site
 * and renders a multi-select. See form-builder#field-overrides (custom Block in `fields`).
 */
export const WorkshopsFormFieldBlock: Block = {
  slug: 'workshops',
  interfaceName: 'FormBlockWorkshops',
  labels: {
    singular: 'Výběr z Workshopů',
    plural: 'Výběry z Workshopů',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: false,
      admin: { hidden: true },
    },
    {
      name: 'label',
      type: 'text',
      label: 'Štítek',
      localized: true,
    },
    {
      ...POPIS_FIELD,
    },
    {
      name: 'required',
      type: 'checkbox',
      label: 'Povinné',
    },
  ],
}

const BLOCK_KEYS = [
  'checkbox',
  'date',
  'email',
  'number',
  'radio',
  'select',
  'text',
  'textarea',
] as const

/** Plugin `fields` map — renamed labels, no country, + workshops multi-select. */
export function nazemiFormBuilderFields(): Record<string, boolean | Block> {
  const map: Record<string, boolean | Block> = {
    country: false,
    payment: false,
    state: false,
    upload: false,
    workshops: WorkshopsFormFieldBlock,
  }

  const message = formBuilderFields.message
  if (message && typeof message === 'object' && 'fields' in message) {
    map.message = withLabels(simplifyFormFieldBlock(message as Block), 'message')
  } else {
    map.message = true
  }

  for (const key of BLOCK_KEYS) {
    const block = formBuilderFields[key]
    if (block && typeof block === 'object' && 'fields' in block) {
      map[key] = withLabels(simplifyFormFieldBlock(block as Block), key)
    } else {
      map[key] = true
    }
  }

  return map
}

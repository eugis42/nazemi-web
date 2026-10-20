import { slugify } from '@/lib/slug'

/** Form Builder field `name` / option `value` — lowercase, underscore, no specials. */
export function formFieldKey(source: string, fallback = 'field'): string {
  const base = slugify(source).replace(/-/g, '_') || fallback
  // Must start with a letter for common form/email template use.
  return /^[a-z]/.test(base) ? base : `f_${base}`
}

/** Unique keys: `email`, `email2`, `email3`, … */
export function uniqueFormFieldKey(
  source: string,
  used: Set<string>,
  fallback = 'field',
): string {
  const base = formFieldKey(source, fallback)
  if (!used.has(base)) {
    used.add(base)
    return base
  }
  let n = 2
  while (used.has(`${base}${n}`)) n += 1
  const next = `${base}${n}`
  used.add(next)
  return next
}

type FormFieldRow = {
  blockType?: string
  label?: string | null
  name?: string | null
  options?: { label?: string | null; value?: string | null; id?: string | null }[] | null
  [key: string]: unknown
}

/** Fill hidden `name` / option `value` from labels before save. */
export function assignFormFieldKeys(fields: unknown): FormFieldRow[] | unknown {
  if (!Array.isArray(fields)) return fields
  const usedNames = new Set<string>()

  return fields.map((raw) => {
    if (!raw || typeof raw !== 'object') return raw
    const field = { ...(raw as FormFieldRow) }
    if (field.blockType === 'message') return field

    const label =
      (typeof field.label === 'string' && field.label.trim()) ||
      (typeof field.name === 'string' && field.name.trim()) ||
      field.blockType ||
      'field'
    field.name = uniqueFormFieldKey(label, usedNames, field.blockType || 'field')

    if (Array.isArray(field.options)) {
      const usedVals = new Set<string>()
      field.options = field.options.map((opt) => {
        const optLabel =
          (typeof opt?.label === 'string' && opt.label.trim()) ||
          (typeof opt?.value === 'string' && opt.value.trim()) ||
          'option'
        return {
          ...opt,
          value: uniqueFormFieldKey(optLabel, usedVals, 'option'),
        }
      })
    }

    return field
  })
}

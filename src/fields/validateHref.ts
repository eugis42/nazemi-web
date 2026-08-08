import type { Validate } from 'payload'

/** Admin hint for URL fields. */
export const hrefFieldDescription =
  'Relativní cesta (/aktuality) nebo absolutní URL (https://…).'

/**
 * Accept relative paths (`/…`), http(s), mailto, tel.
 * Reject `javascript:`, protocol-relative `//`, and free text.
 */
export function hrefFormatError(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Zadejte URL.'
  if (/^javascript:/i.test(v)) return 'URL nesmí používat javascript:.'
  if (v.startsWith('/') && !v.startsWith('//')) return null
  if (/^(mailto|tel):/i.test(v)) return null
  if (/^https?:\/\//i.test(v)) {
    try {
      // eslint-disable-next-line no-new
      new URL(v)
      return null
    } catch {
      return 'Neplatná absolutní URL.'
    }
  }
  return 'URL musí začínat / nebo https:// (příp. mailto: / tel:).'
}

export const validateRequiredHref: Validate = (value) => {
  if (typeof value !== 'string' || !value.trim()) return 'Zadejte URL.'
  return hrefFormatError(value) || true
}

export const validateOptionalHref: Validate = (value) => {
  if (value == null || value === '') return true
  if (typeof value !== 'string') return 'Neplatná URL.'
  return hrefFormatError(value) || true
}

/** Require href when any sibling donate field is filled. */
export const validateDonateHref: Validate = (value, { siblingData, data }) => {
  const fromSiblings = siblingData as {
    title?: string | null
    body?: string | null
    buttonLabel?: string | null
  } | null
  const fromDoc = (data as { donateCta?: typeof fromSiblings } | undefined)?.donateCta
  // Group field validate: prefer same-level siblings; fall back to doc.donateCta.
  const group =
    fromSiblings &&
    ('title' in fromSiblings || 'body' in fromSiblings || 'buttonLabel' in fromSiblings)
      ? fromSiblings
      : fromDoc

  const anyFilled = Boolean(
    (typeof group?.title === 'string' && group.title.trim()) ||
      (typeof group?.body === 'string' && group.body.trim()) ||
      (typeof group?.buttonLabel === 'string' && group.buttonLabel.trim()) ||
      (typeof value === 'string' && value.trim()),
  )
  if (!anyFilled) return true
  if (typeof value !== 'string' || !value.trim()) {
    return 'URL tlačítka je povinná, pokud je vyplněna výzva k darování.'
  }
  return hrefFormatError(value) || true
}

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

/** Absolute http(s) / protocol-relative → external. */
export const isExternalHref = (href?: string | null): boolean => {
  if (!href) return false
  const trimmed = href.trim()
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('/')) return false
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return true
  return /^(https?:)?\/\//i.test(trimmed) || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
}

/** PDF (or similar) downloads — new tab, often with file icon, no ↗. */
export const isDocumentHref = (href?: string | null): boolean =>
  Boolean(href?.toLowerCase().split('?')[0]?.endsWith('.pdf'))

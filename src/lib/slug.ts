import { foldDiacritics } from '@/lib/diacritics'

export const slugify = (value: string) =>
  foldDiacritics(value)
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const ensureLeadingSlash = (value: string) => {
  if (!value) {
    return '/'
  }

  return value.startsWith('/') ? value : `/${value}`
}

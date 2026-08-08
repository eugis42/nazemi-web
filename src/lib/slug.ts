export const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const ensureLeadingSlash = (value: string) => {
  if (!value) {
    return '/'
  }

  return value.startsWith('/') ? value : `/${value}`
}

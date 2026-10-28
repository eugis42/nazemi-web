/** Publikace (and similar) listing order via `?order=` query. */

export const PUBLIKACE_ORDER_DEFAULT = 'newest' as const

export const PUBLIKACE_ORDER_OPTIONS = [
  {
    value: 'newest',
    label: 'Nejnovější → Nejstarší',
    sort: '-publishedAt',
  },
  {
    value: 'oldest',
    label: 'Nejstarší → Nejnovější',
    sort: 'publishedAt',
  },
  {
    value: 'title-asc',
    label: 'Název a → z',
    sort: 'title',
  },
  {
    value: 'title-desc',
    label: 'Název z → a',
    sort: '-title',
  },
] as const

export type PublikaceOrderValue = (typeof PUBLIKACE_ORDER_OPTIONS)[number]['value']

export function resolvePublikaceOrder(
  raw: string | string[] | undefined,
): (typeof PUBLIKACE_ORDER_OPTIONS)[number] {
  const value = Array.isArray(raw) ? raw[0] : raw
  return (
    PUBLIKACE_ORDER_OPTIONS.find((option) => option.value === value) ||
    PUBLIKACE_ORDER_OPTIONS[0]
  )
}

/** Drop default from URLs so bare `/publikace` = newest. */
export function publikaceOrderQueryValue(
  value: PublikaceOrderValue,
): PublikaceOrderValue | undefined {
  return value === PUBLIKACE_ORDER_DEFAULT ? undefined : value
}

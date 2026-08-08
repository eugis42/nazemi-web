import type { BlockHeaderAction } from '@/components/frontend/ui'
import { isDocumentHref, isExternalHref } from '@/lib/links'
import { withSiteQuery } from '@/lib/content'

export type BlockActionInput = {
  external?: boolean | null
  href?: string | null
  label?: string | null
  variant?: string | null
}

/** Map CMS CTA rows (+ legacy single actionLabel/Href) → BlockHeader actions. */
export function resolveBlockActions({
  actionHref,
  actionLabel,
  actions,
  defaultHref,
  defaultLabel,
  defaultVariant = 'outline',
  siteSlug,
}: {
  actionHref?: string | null
  actionLabel?: string | null
  actions?: BlockActionInput[] | null
  defaultHref?: string
  defaultLabel?: string
  defaultVariant?: string
  siteSlug: string
}): BlockHeaderAction[] {
  const rows =
    actions?.filter((a) => a?.label && a?.href)?.length
      ? actions.filter((a) => a?.label && a?.href)
      : actionLabel && actionHref
        ? [{ href: actionHref, label: actionLabel, variant: defaultVariant }]
        : defaultLabel && defaultHref
          ? [{ href: defaultHref, label: defaultLabel, variant: defaultVariant }]
          : []

  return rows.map((action) => {
    const href = action.href || '#'
    const doc = isDocumentHref(href)
    const external = !doc && isExternalHref(href)
    return {
      external,
      href: external || doc ? href : withSiteQuery(href, siteSlug),
      label: action.label,
      newTab: doc || undefined,
      variant: mapCtaVariant(action.variant) || defaultVariant,
    }
  })
}

/** CMS Plné/Obrys (+ legacy button variants) → Button class keys. */
export function mapCtaVariant(variant?: string | null): string {
  switch (variant) {
    case 'filled':
    case 'filled-ground':
      return 'filled'
    case 'outline':
    case 'outline-ground':
    case 'filled-sky':
      return 'outline'
    case 'filled-green':
      return 'filled-green'
    case 'outline-sky':
      return 'outline-sky'
    default:
      return variant || 'outline'
  }
}

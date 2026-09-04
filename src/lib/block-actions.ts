import type { BlockHeaderAction } from '@/components/frontend/ui'
import { isDocumentHref, isExternalHref } from '@/lib/links'
import { withSiteQuery } from '@/lib/content'
import { resolveNavReferenceHref } from '@/lib/menu'

export type BlockActionInput = {
  backgroundColor?: string | null
  external?: boolean | null
  href?: string | null
  label?: string | null
  linkType?: 'internal' | 'external' | null
  reference?: unknown
  variant?: string | null
}

function resolvedActionTarget(action: BlockActionInput): {
  href: string
  label: string | null
} | null {
  if (action.linkType === 'internal') {
    const resolved = resolveNavReferenceHref(action.reference)
    if (!resolved?.href) return null
    const label =
      (typeof action.label === 'string' && action.label.trim()) || resolved.title || resolved.href
    return { href: resolved.href, label }
  }

  const href = typeof action.href === 'string' ? action.href.trim() : ''
  if (!href) return null
  const label = (typeof action.label === 'string' && action.label.trim()) || href
  return { href, label }
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
  const fromCms = (actions || [])
    .map((action) => {
      const target = resolvedActionTarget(action)
      if (!target) return null
      return { ...action, href: target.href, label: target.label }
    })
    .filter((action): action is BlockActionInput & { href: string; label: string } =>
      Boolean(action?.href && action?.label),
    )

  const rows = fromCms.length
    ? fromCms
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
      backgroundColor: action.backgroundColor || null,
      external,
      href: external || doc ? href : withSiteQuery(href, siteSlug),
      label: action.label,
      newTab: doc || undefined,
      variant: mapCtaVariant(action.variant) || defaultVariant,
    }
  })
}

/** CMS Plné/Obrys/Barevné (+ legacy button variants) → Button class keys. */
export function mapCtaVariant(variant?: string | null): string {
  switch (variant) {
    case 'filled':
    case 'filled-ground':
      return 'filled'
    case 'outline':
    case 'outline-ground':
    case 'filled-sky':
      return 'outline'
    case 'colored':
      return 'colored'
    case 'filled-green':
      return 'filled-green'
    case 'outline-sky':
      return 'outline-sky'
    default:
      return variant || 'outline'
  }
}

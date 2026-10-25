import type { BlockHeaderAction } from '@/components/frontend/BlockHeader'
import { isDocumentHref, isExternalHref } from '@/lib/links'
import { withSiteQuery } from '@/lib/content'
import { resolveNavTarget } from '@/lib/nav-target'

export type BlockActionInput = {
  backgroundColor?: string | null
  external?: boolean | null
  href?: string | null
  label?: string | null
  linkType?: 'internal' | 'external' | null
  reference?: unknown
  title?: string | null
  url?: string | null
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
  const fromCms = (actions || [])
    .map((action) => {
      const target = resolveNavTarget({
        href: action.href,
        label: action.label,
        linkType: action.linkType,
        reference: action.reference,
        title: action.title,
        url: action.url,
      })
      if (!target) return null
      if (target.kind === 'form') {
        return {
          backgroundColor: action.backgroundColor || null,
          formId: target.formId,
          formTitle: target.formTitle,
          label: target.label,
          variant: mapCtaVariant(action.variant) || defaultVariant,
        } satisfies BlockHeaderAction
      }
      return {
        ...action,
        href: target.href,
        label: target.label,
        external: target.external,
      }
    })
    .filter((action): action is NonNullable<typeof action> => Boolean(action))

  const rows = fromCms.length
    ? fromCms
    : actionLabel && actionHref
      ? [{ href: actionHref, label: actionLabel, variant: defaultVariant }]
      : defaultLabel && defaultHref
        ? [{ href: defaultHref, label: defaultLabel, variant: defaultVariant }]
        : []

  return rows.map((action) => {
    const backgroundColor =
      'backgroundColor' in action ? action.backgroundColor || null : null
    if ('formId' in action && action.formId != null) {
      return {
        backgroundColor,
        formId: action.formId,
        formTitle:
          ('formTitle' in action && action.formTitle) || action.label || null,
        label: action.label,
        variant: mapCtaVariant(action.variant) || defaultVariant,
      }
    }

    const href = ('href' in action && action.href) || '#'
    const doc = isDocumentHref(href)
    const external =
      'external' in action && action.external != null
        ? Boolean(action.external)
        : !doc && isExternalHref(href)
    return {
      backgroundColor,
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

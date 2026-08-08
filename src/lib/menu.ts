import type { Site } from '@/payload-types'
import { isExternalHref } from '@/lib/links'

type MenuItem = NonNullable<Site['mainMenu']>[number]
type MenuChild = NonNullable<MenuItem['children']>[number]
type AnyMenuItem = MenuItem | MenuChild

type RefDoc = {
  slug?: string | null
  title?: string | null
  name?: string | null
}

function collectionPath(relationTo: string, slug: string): string {
  switch (relationTo) {
    case 'stranky':
      return slug === 'home' || slug === 'homepage' ? '/' : `/${slug}`
    case 'aktuality':
      return `/aktuality/${slug}`
    case 'kalendar':
      return `/kalendar/${slug}`
    case 'workshopy':
      return `/workshopy/${slug}`
    case 'publikace':
      return `/publikace/${slug}`
    case 'projekty':
      return `/projekty/${slug}`
    default:
      return `/${slug}`
  }
}

function resolveReferenceHref(
  reference: AnyMenuItem['reference'],
): { href: string; title: string | null } | null {
  if (!reference || typeof reference !== 'object') return null
  const relationTo = 'relationTo' in reference ? reference.relationTo : null
  const value = 'value' in reference ? reference.value : null
  if (!relationTo || value == null) return null

  if (typeof value === 'object') {
    const doc = value as RefDoc
    const slug = typeof doc.slug === 'string' ? doc.slug : null
    if (!slug) return null
    const title =
      (typeof doc.title === 'string' && doc.title) ||
      (typeof doc.name === 'string' && doc.name) ||
      null
    return { href: collectionPath(relationTo, slug), title }
  }

  return null
}

/** Resolve nav item label + href for FE (internal relationship or external URL). */
export function resolveMenuItem(item: AnyMenuItem | null | undefined): {
  label: string
  href: string
  external: boolean
} | null {
  if (!item) return null

  if (item.linkType === 'internal') {
    const resolved = resolveReferenceHref(item.reference)
    if (!resolved?.href) return null
    const label =
      (typeof item.label === 'string' && item.label.trim()) || resolved.title || resolved.href
    return { label, href: resolved.href, external: false }
  }

  // external (default) — also covers legacy rows missing linkType
  const href = typeof item.href === 'string' ? item.href.trim() : ''
  if (!href) return null
  const label = (typeof item.label === 'string' && item.label.trim()) || href
  return { label, href, external: isExternalHref(href) }
}

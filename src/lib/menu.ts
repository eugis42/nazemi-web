import type { Site } from '@/payload-types'
import {
  collectionHomePath,
  isCollectionHomeKey,
} from '@/lib/collection-homes'
import { isExternalHref } from '@/lib/links'
import type { NestedMenuItem } from '@/lib/menu-tree'
import { nestMenuItems } from '@/lib/menu-tree'

type FlatMenuItem = NonNullable<Site['mainMenu']>[number]
export type MenuItem = NestedMenuItem<Omit<FlatMenuItem, 'depth'>>
type AnyMenuItem = MenuItem | NonNullable<MenuItem['children']>[number]

type RefDoc = {
  collectionKey?: string | null
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

export function resolveNavReferenceHref(
  reference: unknown,
): { href: string; title: string | null } | null {
  if (!reference || typeof reference !== 'object') return null
  const rel = reference as { relationTo?: unknown; value?: unknown }
  const relationTo = typeof rel.relationTo === 'string' ? rel.relationTo : null
  const value = rel.value
  if (!relationTo || value == null) return null

  if (typeof value === 'object') {
    const doc = value as RefDoc

    if (relationTo === 'prehledy') {
      if (!isCollectionHomeKey(doc.collectionKey)) return null
      const title = (typeof doc.title === 'string' && doc.title) || null
      return { href: collectionHomePath(doc.collectionKey), title }
    }

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
    const resolved = resolveNavReferenceHref(item.reference)
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

/** Nest flat mainMenu (depth) for header / breadcrumbs. */
export function nestedMainMenu(items: Site['mainMenu']): MenuItem[] {
  return nestMenuItems<Omit<FlatMenuItem, 'depth'>>(items || [])
}

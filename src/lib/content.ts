import type { CSSProperties } from 'react'

import type { Media, Site } from '@/payload-types'

import { resolveMenuItem } from '@/lib/menu'
import { MAIN_SITE_SLUG } from '@/lib/site-context'

export type MediaLike = Media | number | null | undefined

/** Named Payload upload sizes — see `src/collections/Media.ts`. */
export type MediaSizeName =
  | 'thumb'
  | 'square'
  | 'card'
  | 'landscape'
  | 'portrait'
  | 'hero'
  | 'large'

export function mediaURL(media: MediaLike): string | null {
  if (!media || typeof media === 'number') return null
  return media.url || null
}

/** Prefer named size; fall back to `large`, then original. */
export function mediaSizeURL(media: MediaLike, size: MediaSizeName): string | null {
  if (!media || typeof media === 'number') return null
  const sized = media.sizes?.[size]?.url
  if (typeof sized === 'string' && sized) return sized
  if (size !== 'large') {
    const large = media.sizes?.large?.url
    if (typeof large === 'string' && large) return large
  }
  return media.url || null
}

/** Prefer upload `card` size for listing thumbs when available. */
export function mediaCardURL(media: MediaLike): string | null {
  return mediaSizeURL(media, 'card')
}

/** CSS `object-position` from Payload focal point (0–100). */
export function mediaFocalStyle(media: MediaLike): CSSProperties | undefined {
  if (!media || typeof media === 'number') return undefined
  const x = media.focalX
  const y = media.focalY
  if (x == null && y == null) return undefined
  return { objectPosition: `${x ?? 50}% ${y ?? 50}%` }
}

export function mediaAlt(media: MediaLike, fallback = ''): string {
  if (!media || typeof media === 'number') return fallback
  return media.alt || fallback
}

export type PopulatedSite = {
  id: number
  name: string
  slug: string
  siteType?: 'main' | 'subsite' | null
}

export function populatedSite(site: unknown): PopulatedSite | null {
  if (!site || typeof site !== 'object') return null
  if ('slug' in site && 'name' in site && 'id' in site) {
    return site as PopulatedSite
  }
  return null
}

/**
 * Source label on FE: sub-web title when content lives on a sub-web.
 * Main-web docs → never show. Only when browsing the main site (cross-posts).
 */
export function crossPostSiteName({
  currentSiteSlug,
  docSite,
}: {
  currentSiteSlug: string
  docSite: unknown
  /** @deprecated Ignored — site relationship is the source of truth. */
  showOnMainSite?: boolean | null
}): string | null {
  if (currentSiteSlug !== MAIN_SITE_SLUG) return null
  const site = populatedSite(docSite)
  if (!site || site.slug === MAIN_SITE_SLUG || site.siteType === 'main') return null
  return site.name || null
}

export type QueryParamValue = string | string[] | undefined

/** Normalise a repeatable filter param — accepts `?tag=a&tag=b` and `?tag=a,b`. */
export function queryList(value: QueryParamValue): string[] {
  if (!value) return []
  const entries = Array.isArray(value) ? value : [value]

  return entries
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/** Multi-select chip toggle — returns `undefined` once the last value is removed. */
export function toggleQueryValue(list: string[], value: string): string[] | undefined {
  const next = list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
  return next.length ? next : undefined
}

/** Listing URL that keeps the current query params, applying `overrides` on top. */
export function hrefWith(
  basePath: string,
  current: Record<string, QueryParamValue>,
  overrides: Record<string, QueryParamValue>,
  siteSlug: string,
): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    if (key === 'site' || !value) continue
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry) params.append(key, entry)
    }
  }

  const query = params.toString()
  return withSiteQuery(query ? `${basePath}?${query}` : basePath, siteSlug)
}

type MenuChild = { href: string; label: string }
type MenuItem = NonNullable<Site['mainMenu']>[number]

function normaliseMenuHref(href: string): string {
  const [rawPath = '', rawQuery = ''] = href.split('?')
  const path = rawPath.replace(/\/+$/, '') || '/'
  const params = new URLSearchParams(rawQuery)
  params.delete('site')
  const query = params.toString()

  return query ? `${path}?${query}` : path
}

/**
 * Main-menu lookup for breadcrumbs: the parent entry that lists `href` as a child,
 * plus its children as breadcrumb siblings (design `findNavChildByHref`).
 */
export function menuParentForHref(
  mainMenu: MenuItem[] | null | undefined,
  href: string,
): { parent: MenuChild; siblings: MenuChild[] } | null {
  const target = normaliseMenuHref(href)

  for (const item of mainMenu || []) {
    const parentResolved = resolveMenuItem(item)
    if (!parentResolved) continue
    const children = (item.children || [])
      .map((child) => resolveMenuItem(child))
      .filter(Boolean) as MenuChild[]
    if (!children.length) continue
    if (!children.some((child) => normaliseMenuHref(child.href) === target)) continue
    if (normaliseMenuHref(parentResolved.href) === target) continue

    return {
      parent: { href: parentResolved.href, label: parentResolved.label },
      siblings: children.map((child) => ({ href: child.href, label: child.label })),
    }
  }

  return null
}

export function withSiteQuery(href: string, siteSlug: string): string {
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) {
    return href
  }
  if (siteSlug === 'nazemi') return href
  const sep = href.includes('?') ? '&' : '?'
  return `${href}${sep}site=${encodeURIComponent(siteSlug)}`
}

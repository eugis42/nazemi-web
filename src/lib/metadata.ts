import type { Metadata } from 'next'

import type { Media, Site } from '@/payload-types'

import { mediaSizeURL, mediaURL } from '@/lib/content'
import { MAIN_SITE_SLUG } from '@/lib/site-context'

/** Page/doc fields used for SEO + social previews. */
export type SeoDoc = {
  canonicalURL?: string | null
  coverImage?: (number | null) | Media
  description?: string | null
  excerpt?: string | null
  logo?: (number | null) | Media
  metaTitle?: string | null
  noindex?: boolean | null
  sharingImage?: (number | null) | Media
  title?: string | null
}

function siteBrandName(site: Site): string {
  return site.name?.trim() || 'NaZemi'
}

/** Main web: ` ∞ `; subsites: ` · `. */
function titleSeparator(site: Site): string {
  if (site.siteType === 'main' || site.slug === MAIN_SITE_SLUG) {
    return ' ∞ '
  }
  return ' · '
}

function siteOrigin(site: Site): string {
  const fromSite = site.canonicalURL?.trim().replace(/\/$/, '')
  if (fromSite) return fromSite
  const fromEnv = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  return 'http://localhost:3000'
}

function absoluteUrl(pathOrUrl: string | null | undefined, site: Site): string | undefined {
  if (!pathOrUrl) return undefined
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl
  const base = siteOrigin(site)
  return `${base}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`
}

function asMedia(value: (number | null) | Media | undefined): Media | null {
  if (!value || typeof value === 'number') return null
  return value
}

/** Prefer large OG-friendly sizes. */
function mediaOgURL(media: Media | null): string | null {
  if (!media) return null
  return (
    mediaSizeURL(media, 'large')
    || mediaSizeURL(media, 'hero')
    || mediaSizeURL(media, 'card')
    || mediaURL(media)
  )
}

function resolveShareImage(doc: SeoDoc | null | undefined, site: Site): Media | null {
  return (
    asMedia(doc?.sharingImage)
    || asMedia(doc?.coverImage)
    || asMedia(doc?.logo)
    || asMedia(site.sharingImage)
  )
}

function resolveDescription(doc: SeoDoc | null | undefined, site: Site): string | undefined {
  const text =
    doc?.description?.trim()
    || doc?.excerpt?.trim()
    || site.description?.trim()
    || undefined
  return text || undefined
}

function faviconIcons(site: Site): Metadata['icons'] {
  const iconMedia = asMedia(site.favicon?.icon)
  const appleMedia = asMedia(site.favicon?.appleTouchIcon)

  const iconUrl = mediaURL(iconMedia)
  const appleUrl = mediaURL(appleMedia) || mediaSizeURL(appleMedia, 'square')

  const iconMime = iconMedia?.mimeType || undefined
  const iconIsSvg = iconMime?.includes('svg') || iconUrl?.endsWith('.svg')

  return {
    apple: appleUrl
      ? [{ url: appleUrl, sizes: '180x180', type: 'image/png' }]
      : [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    icon: iconUrl
      ? [
          {
            url: iconUrl,
            type: iconIsSvg ? 'image/svg+xml' : iconMime || undefined,
          },
          ...(iconIsSvg
            ? [{ url: '/icon-32.png', sizes: '32x32', type: 'image/png' as const }]
            : []),
        ]
      : [
          { url: '/favicon.svg', type: 'image/svg+xml' },
          { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
        ],
  }
}

/**
 * Shared SEO for frontend routes (2026: title, description, canonical, OG, Twitter, icons).
 * Layout calls with `root: true` (title template). Pages pass `doc` + `path`.
 */
export function buildPageMetadata({
  doc,
  path,
  root = false,
  site,
}: {
  doc?: SeoDoc | null
  path?: string
  /** Layout / homepage — sets default title + `%s` template with site suffix. */
  root?: boolean
  site: Site
}): Metadata {
  const brand = siteBrandName(site)
  const sep = titleSeparator(site)
  const description = resolveDescription(doc, site)
  const shareMedia = resolveShareImage(doc, site)
  const imagePath = mediaOgURL(shareMedia)
  const imageUrl = absoluteUrl(imagePath, site)
  const canonical =
    doc?.canonicalURL?.trim()
    || (path ? absoluteUrl(path, site) : undefined)
    || site.canonicalURL?.trim()
    || undefined
  const noindex = Boolean(doc?.noindex || site.noindex)
  const metadataBase = new URL(`${siteOrigin(site)}/`)

  const pageTitle =
    doc?.metaTitle?.trim() || doc?.title?.trim() || null

  const isHome = path === '/'

  const title: Metadata['title'] = root
    ? {
        default: site.metaTitle?.trim() || brand,
        template: `%s${sep}${brand}`,
      }
    : isHome
      ? { absolute: pageTitle || site.metaTitle?.trim() || brand }
      : pageTitle && pageTitle !== brand
        ? pageTitle
        : { absolute: site.metaTitle?.trim() || brand }

  const ogTitle = isHome || root || !pageTitle || pageTitle === brand
    ? (isHome ? pageTitle || site.metaTitle?.trim() || brand : site.metaTitle?.trim() || brand)
    : `${pageTitle}${sep}${brand}`

  return {
    metadataBase,
    alternates: canonical ? { canonical } : undefined,
    description,
    icons: faviconIcons(site),
    openGraph: {
      description,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: shareMedia?.alt || ogTitle,
            },
          ]
        : undefined,
      locale: 'cs_CZ',
      siteName: brand,
      title: ogTitle,
      type: 'website',
      url: canonical,
    },
    robots: noindex ? { index: false, follow: false } : undefined,
    title,
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      description,
      images: imageUrl ? [imageUrl] : undefined,
      title: ogTitle,
    },
  }
}

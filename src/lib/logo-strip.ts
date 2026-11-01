import type { Media } from '@/payload-types'

import { mediaAlt, mediaSizeURL, mediaURL } from '@/lib/content'

export type LogoStripItem = {
  alt: string
  href?: string | null
  url: string
}

export type LogoStripAlign = 'left' | 'center'

type LogoStripSource = {
  align?: unknown
  /** Current: logos[{ image, href }] */
  logos?: unknown
  /** Legacy hasMany + side links — still rendered until re-saved. */
  images?: unknown
  links?: unknown
}

function asSource(raw: unknown): LogoStripSource | null {
  if (!raw || typeof raw !== 'object') return null
  return raw as LogoStripSource
}

function mediaFromUnknown(image: unknown): Media | null {
  if (!image || typeof image !== 'object') return null
  return image as Media
}

function hrefAt(links: unknown, index: number): string | null {
  if (!Array.isArray(links)) return null
  const row = links[index]
  if (!row || typeof row !== 'object') return null
  const href = (row as { href?: unknown }).href
  if (typeof href !== 'string') return null
  const trimmed = href.trim()
  return trimmed || null
}

export function resolveLogoStripAlign(raw: unknown): LogoStripAlign {
  const source = asSource(raw)
  return source?.align === 'center' ? 'center' : 'left'
}

/** Normalize Payload logo-strip fields into FE items. */
export function resolveLogoStripItems(raw: unknown): LogoStripItem[] {
  const source = asSource(raw)
  if (!source) return []

  // Primary: logos[{ image, href }]
  if (Array.isArray(source.logos) && source.logos.length) {
    const out: LogoStripItem[] = []
    for (const row of source.logos) {
      if (!row || typeof row !== 'object') continue
      const media = mediaFromUnknown((row as { image?: unknown }).image)
      if (!media) continue
      const url = mediaSizeURL(media, 'large') || mediaURL(media)
      if (!url) continue
      const href =
        typeof (row as { href?: unknown }).href === 'string'
          ? (row as { href: string }).href.trim() || null
          : null
      out.push({
        alt: mediaAlt(media, media.filename || 'Logo'),
        href,
        url,
      })
    }
    return out
  }

  if (!Array.isArray(source.images)) return []
  const out: LogoStripItem[] = []
  source.images.forEach((image, index) => {
    const media = mediaFromUnknown(image)
    if (!media) return
    const url = mediaSizeURL(media, 'large') || mediaURL(media)
    if (!url) return
    out.push({
      alt: mediaAlt(media, media.filename || 'Logo'),
      href: hrefAt(source.links, index),
      url,
    })
  })
  return out
}

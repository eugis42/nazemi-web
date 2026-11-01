import type { Media } from '@/payload-types'

import { mediaAlt, mediaSizeURL, mediaURL } from '@/lib/content'
import { isExternalHref } from '@/lib/links'

export type LogoStripItem = {
  alt: string
  href?: string | null
  url: string
}

type LogoStripSource = {
  images?: unknown
  links?: unknown
  /** Legacy array shape (upload-per-row) — kept for old drafts. */
  logos?: unknown
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

/** Normalize Payload logo-strip fields into FE items. */
export function resolveLogoStripItems(raw: unknown): LogoStripItem[] {
  const source = asSource(raw)
  if (!source) return []

  // Legacy: logos[{ image, href }]
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

type LogoStripProps = {
  logos: LogoStripItem[]
  title?: string | null
}

/**
 * Funding / support logos — equal slots, contain inside fixed track.
 * Same visual cap (~64px tall / ~160px wide), even gaps regardless of asset ratio.
 */
export function LogoStrip({ logos: raw, title }: LogoStripProps) {
  const logos = raw.filter((item) => Boolean(item.url))
  if (!logos.length) return null

  return (
    <section className="w-full" data-block="logoStrip">
      {title?.trim() ? (
        <h2 className="font-saans mb-6 text-[20px] font-medium leading-none tracking-tight text-ground lg:text-[24px]">
          {title.trim()}
        </h2>
      ) : null}
      <ul
        className="grid grid-cols-2 items-center justify-items-center gap-x-8 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:flex-wrap lg:justify-start"
        role="list"
      >
        {logos.map((logo, index) => {
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={logo.alt}
              className="max-h-12 max-w-[140px] object-contain object-center lg:max-h-14 lg:max-w-[160px] lg:object-left"
              height={56}
              loading="lazy"
              src={logo.url}
              width={160}
            />
          )
          const key = `${logo.url}-${index}`
          const slot =
            'flex h-14 w-full max-w-[160px] items-center justify-center lg:h-16 lg:w-[160px] lg:justify-start'
          if (logo.href) {
            const external = isExternalHref(logo.href)
            return (
              <li className={slot} key={key}>
                <a
                  className="inline-flex h-full w-full items-center justify-center transition-opacity duration-150 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ground lg:justify-start"
                  href={logo.href}
                  rel={external ? 'noopener noreferrer' : undefined}
                  target={external ? '_blank' : undefined}
                >
                  {img}
                </a>
              </li>
            )
          }
          return (
            <li className={slot} key={key}>
              {img}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

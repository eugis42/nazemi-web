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
 * Funding / support logos — left-aligned strip, capped size, no lightbox.
 * Optional external link per logo.
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
      <ul className="flex flex-wrap items-center justify-start gap-x-8 gap-y-6" role="list">
        {logos.map((logo, index) => {
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={logo.alt}
              className="h-auto max-h-16 w-auto max-w-[160px] object-contain object-left"
              height={64}
              loading="lazy"
              src={logo.url}
            />
          )
          const key = `${logo.url}-${index}`
          if (logo.href) {
            const external = isExternalHref(logo.href)
            return (
              <li className="flex max-h-16 max-w-[160px] items-center" key={key}>
                <a
                  className="inline-flex max-h-16 max-w-[160px] items-center transition-opacity duration-150 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ground"
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
            <li className="flex max-h-16 max-w-[160px] items-center" key={key}>
              {img}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

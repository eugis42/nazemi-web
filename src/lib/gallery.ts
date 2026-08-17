import type { CSSProperties } from 'react'

import type { Media } from '@/payload-types'

import { mediaFocalStyle, mediaSizeURL } from '@/lib/content'

export type GalleryImage = {
  /** Grid / inline display — optimised `large` (no crop). */
  url: string
  /** Lightbox — same as `url` (full-frame optimised). */
  fullUrl?: string
  alt?: string | null
  caption?: string | null
  style?: CSSProperties
}

/** Normalize Payload media relations into GalleryImage[]. */
export function resolveGalleryImages(raw: unknown): GalleryImage[] {
  if (!Array.isArray(raw)) return []
  const out: GalleryImage[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const media = item as Media
    const url = mediaSizeURL(media, 'large')
    if (!url) continue
    out.push({
      url,
      fullUrl: url,
      alt: media.alt,
      caption: media.caption,
      style: mediaFocalStyle(media),
    })
  }
  return out
}

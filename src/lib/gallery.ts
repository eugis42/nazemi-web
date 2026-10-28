import type { CSSProperties } from 'react'

import type { Media } from '@/payload-types'

import {
  mediaAuthorship,
  mediaDims,
  mediaFocalStyle,
  mediaSizeURL,
} from '@/lib/content'

export type GalleryImage = {
  /** Grid / inline display — optimised `large` (no crop). */
  url: string
  /** Lightbox — same as `url` (full-frame optimised). */
  fullUrl?: string
  alt?: string | null
  caption?: string | null
  authorship?: string | null
  style?: CSSProperties
  width?: number | null
  height?: number | null
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
    const dims = mediaDims(media, 'large') || mediaDims(media)
    out.push({
      url,
      fullUrl: url,
      alt: media.alt,
      caption: media.caption,
      authorship: mediaAuthorship(media),
      style: mediaFocalStyle(media),
      width: dims?.width ?? null,
      height: dims?.height ?? null,
    })
  }
  return out
}

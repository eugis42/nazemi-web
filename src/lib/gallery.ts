export type GalleryImage = {
  url: string
  alt?: string | null
  caption?: string | null
}

/** Normalize Payload media relations into GalleryImage[]. */
export function resolveGalleryImages(raw: unknown): GalleryImage[] {
  if (!Array.isArray(raw)) return []
  const out: GalleryImage[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const media = item as { url?: string | null; alt?: string | null; caption?: string | null }
    if (!media.url) continue
    out.push({
      url: media.url,
      alt: media.alt,
      caption: media.caption,
    })
  }
  return out
}

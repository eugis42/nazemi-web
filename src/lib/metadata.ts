import type { Metadata } from 'next'

import type { Media, Site } from '@/payload-types'

import { mediaURL } from '@/lib/content'

type SeoDoc = {
  canonicalURL?: string | null
  description?: string | null
  excerpt?: string | null
  metaTitle?: string | null
  noindex?: boolean | null
  sharingImage?: (number | null) | Media
  title?: string | null
}

function absoluteUrl(pathOrUrl: string | null | undefined, siteCanonical?: string | null) {
  if (!pathOrUrl) return undefined
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl
  const base = siteCanonical?.replace(/\/$/, '') || ''
  if (!base) return pathOrUrl
  return `${base}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`
}

export function buildPageMetadata({
  doc,
  path,
  site,
}: {
  doc?: SeoDoc | null
  path?: string
  site: Site
}): Metadata {
  const title =
    doc?.metaTitle?.trim() ||
    doc?.title?.trim() ||
    site.metaTitle?.trim() ||
    site.name ||
    'NaZemi'

  const description =
    doc?.description?.trim() ||
    doc?.excerpt?.trim() ||
    site.description?.trim() ||
    site.name ||
    'NaZemi'

  const sharing =
    (doc?.sharingImage && typeof doc.sharingImage === 'object' ? doc.sharingImage : null) ||
    (site.sharingImage && typeof site.sharingImage === 'object' ? site.sharingImage : null)

  const imageUrl = mediaURL(sharing)
  const canonical =
    doc?.canonicalURL?.trim() ||
    (path && site.canonicalURL ? absoluteUrl(path, site.canonicalURL) : undefined) ||
    site.canonicalURL ||
    undefined

  const noindex = Boolean(doc?.noindex || site.noindex)

  return {
    alternates: canonical ? { canonical } : undefined,
    description,
    openGraph: {
      description,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
      title,
      type: 'website',
    },
    robots: noindex ? { index: false, follow: false } : undefined,
    title,
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      description,
      images: imageUrl ? [imageUrl] : undefined,
      title,
    },
  }
}

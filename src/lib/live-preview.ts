import type { Payload } from 'payload'

import { ensureLeadingSlash } from '@/lib/slug'

export type SiteContentCollectionSlug =
  | 'aktuality'
  | 'kalendar'
  | 'lide'
  | 'projekty'
  | 'publikace'
  | 'stranky'
  | 'workshopy'

const COLLECTION_PATH_PREFIX: Record<Exclude<SiteContentCollectionSlug, 'stranky' | 'lide'>, string> =
  {
    aktuality: '/aktuality',
    kalendar: '/kalendar',
    projekty: '/projekty',
    publikace: '/publikace',
    workshopy: '/workshopy',
  }

export function siteContentPath(
  collectionSlug: SiteContentCollectionSlug,
  data: { isHomepage?: boolean | null; slug?: null | string },
): string {
  const slug = typeof data?.slug === 'string' ? data.slug : ''

  if (collectionSlug === 'stranky') {
    // Homepage always lives at `/` (slug may still be `home` in CMS).
    if (data?.isHomepage) return '/'
    return slug ? ensureLeadingSlash(slug) : '/'
  }

  if (collectionSlug === 'lide') {
    return '/kontakt'
  }

  const prefix = COLLECTION_PATH_PREFIX[collectionSlug]
  if (!slug) {
    return '/'
  }

  return `${prefix}/${slug}`
}

async function resolveSiteSlug(
  data: Record<string, unknown>,
  payload: Payload,
): Promise<string | undefined> {
  const siteRef = data.site

  if (siteRef == null) {
    return undefined
  }

  if (typeof siteRef === 'object' && siteRef !== null && 'slug' in siteRef) {
    const s = (siteRef as { slug?: string }).slug
    if (typeof s === 'string') {
      return s
    }
  }

  if (typeof siteRef === 'number' || typeof siteRef === 'string') {
    try {
      const site = await payload.findByID({
        collection: 'sites',
        depth: 0,
        id: siteRef,
      })
      return typeof site.slug === 'string' ? site.slug : undefined
    } catch {
      return undefined
    }
  }

  return undefined
}

/**
 * Wraps a frontend path so the preview iframe enables Next.js draft mode (drafts + live merge).
 */
export function adminLivePreviewUrl(resolvedPath: string): string {
  const path = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`
  const secret = process.env.PREVIEW_SECRET
  const u = new URL('/api/preview', 'http://local.invalid')
  u.searchParams.set('path', path)
  if (secret) {
    u.searchParams.set('secret', secret)
  }
  return `${u.pathname}${u.search}`
}

export async function siteContentLivePreviewUrl(
  collectionSlug: SiteContentCollectionSlug,
  data: Record<string, unknown>,
  payload: Payload,
): Promise<string> {
  let path = siteContentPath(collectionSlug, {
    isHomepage: Boolean(data.isHomepage),
    slug: typeof data.slug === 'string' ? data.slug : null,
  })
  const siteSlug = await resolveSiteSlug(data, payload)

  if (siteSlug) {
    const sep = path.includes('?') ? '&' : '?'
    path = `${path}${sep}site=${encodeURIComponent(siteSlug)}`
  }

  return adminLivePreviewUrl(path)
}

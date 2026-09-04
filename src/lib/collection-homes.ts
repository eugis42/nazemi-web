import type { Payload, PayloadRequest, Where } from 'payload'

import { getAdminSiteSlugFromRequest } from '@/lib/site-context'

export const COLLECTION_HOME_KEYS = [
  'aktuality',
  'kalendar',
  'projekty',
  'workshopy',
  'publikace',
] as const

export type CollectionHomeKey = (typeof COLLECTION_HOME_KEYS)[number]

const TITLES: Record<CollectionHomeKey, string> = {
  aktuality: 'Aktuality',
  kalendar: 'Kalendář',
  projekty: 'Projekty',
  workshopy: 'Workshopy',
  publikace: 'Publikace',
}

const PATHS: Record<CollectionHomeKey, string> = {
  aktuality: '/aktuality',
  kalendar: '/kalendar',
  projekty: '/projekty',
  workshopy: '/workshopy',
  publikace: '/publikace',
}

export function collectionHomeTitle(key: CollectionHomeKey): string {
  return TITLES[key]
}

export function collectionHomePath(key: CollectionHomeKey): string {
  return PATHS[key]
}

export function isCollectionHomeKey(value: unknown): value is CollectionHomeKey {
  return typeof value === 'string' && COLLECTION_HOME_KEYS.includes(value as CollectionHomeKey)
}

/** Ensure one přehled row per listing collection for a site. */
export async function ensureCollectionHomesForSite(
  payload: Payload,
  siteId: number | string,
): Promise<void> {
  const existing = await payload.find({
    collection: 'prehledy',
    depth: 0,
    limit: 20,
    overrideAccess: true,
    pagination: false,
    where: { site: { equals: siteId } },
  })

  const have = new Set(
    existing.docs
      .map((doc) => doc.collectionKey)
      .filter((key): key is CollectionHomeKey => isCollectionHomeKey(key)),
  )

  for (const key of COLLECTION_HOME_KEYS) {
    if (have.has(key)) continue
    await payload.create({
      collection: 'prehledy',
      data: {
        collectionKey: key,
        site: typeof siteId === 'number' ? siteId : Number(siteId),
        title: collectionHomeTitle(key),
      },
      overrideAccess: true,
    })
  }
}

/** Collections that support “show on main site” cross-post. */
export const CROSS_POST_COLLECTIONS = new Set([
  'aktuality',
  'kalendar',
  'publikace',
])

/**
 * Menu internal-link picker: own-site docs + (on main) cross-posts from published sites only.
 * Drops content tied to draft/missing webs.
 */
type MenuFilterReq = {
  context?: Record<string, unknown>
  headers?: PayloadRequest['headers']
  payload: Payload
}

const PUBLISHED_SITE_IDS_CTX = 'menuPublishedSiteIds'

function relationId(value: unknown): number | string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

/**
 * Site scope for internal-link pickers:
 * - Content (stránky blocks, etc.) → `data.site`
 * - Sites / Navigace form → `data.id` (no `site` field on Sites)
 * - Fallback → admin site cookie slug
 */
export async function resolveMenuEditingSiteId({
  data,
  req,
}: {
  data?: Record<string, unknown> | null
  req: MenuFilterReq
}): Promise<number | string | null> {
  const fromSiteField = relationId(data?.site)
  if (fromSiteField != null) return fromSiteField

  if (data && !('site' in data) && data.id != null && data.id !== '') {
    return data.id as number | string
  }

  const slug = getAdminSiteSlugFromRequest(req as PayloadRequest)
  const result = await req.payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: { slug: { equals: slug } },
  })
  return result.docs[0]?.id ?? null
}

// Short TTL — admin relationship pickers often fire parallel filterOptions reqs.
let publishedSiteIdsMemo: { at: number; ids: (number | string)[] } | null = null

/** Test helper — drop process-level filter cache. */
export function clearMenuFilterCachesForTests() {
  publishedSiteIdsMemo = null
}

async function publishedSiteIdsCached(req: MenuFilterReq): Promise<(number | string)[]> {
  const fromCtx = req.context?.[PUBLISHED_SITE_IDS_CTX]
  if (Array.isArray(fromCtx)) return fromCtx as (number | string)[]

  if (publishedSiteIdsMemo && Date.now() - publishedSiteIdsMemo.at < 8_000) {
    return publishedSiteIdsMemo.ids
  }

  const publishedSites = await req.payload.find({
    collection: 'sites',
    depth: 0,
    limit: 200,
    overrideAccess: true,
    pagination: false,
    where: { _status: { equals: 'published' } },
  })
  const ids = publishedSites.docs.map((doc) => doc.id)
  publishedSiteIdsMemo = { at: Date.now(), ids }
  if (req.context) req.context[PUBLISHED_SITE_IDS_CTX] = ids
  return ids
}

export async function menuReferenceFilterOptions({
  data,
  relationTo,
  req,
}: {
  data?: Record<string, unknown> | null
  relationTo?: string
  req: MenuFilterReq
}): Promise<Where | false> {
  const editingSiteId = await resolveMenuEditingSiteId({ data, req })
  if (editingSiteId == null || editingSiteId === '') return false
  if (!relationTo) return false

  const publishedSiteIds = await publishedSiteIdsCached(req)
  const validSiteIds = Array.from(new Set([...publishedSiteIds, editingSiteId]))

  if (relationTo === 'prehledy') {
    await ensureCollectionHomesForSite(req.payload, editingSiteId)
    return {
      and: [{ site: { equals: editingSiteId } }, { site: { in: validSiteIds } }],
    }
  }

  // Stránky: only this web (no cross-post field).
  if (relationTo === 'stranky') {
    return {
      and: [{ site: { equals: editingSiteId } }, { site: { in: validSiteIds } }],
    }
  }

  // Projekty: main web only — still require live site.
  if (relationTo === 'projekty') {
    return {
      and: [{ site: { equals: editingSiteId } }, { site: { in: validSiteIds } }],
    }
  }

  const siteScope: Where[] = [{ site: { equals: editingSiteId } }]

  if (CROSS_POST_COLLECTIONS.has(relationTo)) {
    const editingSite = await req.payload.findByID({
      collection: 'sites',
      depth: 0,
      id: editingSiteId,
      overrideAccess: true,
    })
    const isMain =
      editingSite?.siteType === 'main' || editingSite?.slug === 'nazemi'

    if (isMain) {
      const otherPublished = publishedSiteIds.filter((id) => String(id) !== String(editingSiteId))
      if (otherPublished.length) {
        siteScope.push({
          and: [
            { showOnMainSite: { equals: true } },
            { site: { in: otherPublished } },
          ],
        })
      }
    }
  }

  return {
    and: [{ or: siteScope }, { site: { in: validSiteIds } }],
  }
}

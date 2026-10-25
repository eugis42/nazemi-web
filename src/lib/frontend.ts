import { draftMode, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import config from '@payload-config'

import { FRONTEND_SITE_HEADER, MAIN_SITE_SLUG, getFrontendSiteSlug } from './site-context'

export const getPayloadClient = async () => {
  const payloadConfig = await config
  return getPayload({ config: payloadConfig })
}

/** Next.js draft mode (admin live preview / preview button). */
export const isDraftPreview = async () => {
  const { isEnabled } = await draftMode()
  return isEnabled
}

/**
 * Local API flags for draft-aware content queries.
 * Without `draft: true`, Payload only returns published versions → live preview 404s.
 */
export const draftFindOptions = async () => {
  const draft = await isDraftPreview()
  return { draft } as const
}

export const resolveSiteFromRequest = async ({
  headerSiteSlug,
  host,
  querySiteSlug,
}: {
  headerSiteSlug?: null | string
  host?: null | string
  querySiteSlug?: null | string
}) => {
  const siteSlug = getFrontendSiteSlug({ headerSiteSlug, host, querySiteSlug })
  const draft = await isDraftPreview()
  const payload = await getPayloadClient()

  const identityWhere: Where = {
    or: [
      {
        slug: {
          equals: siteSlug,
        },
      },
      {
        subdomain: {
          equals: siteSlug,
        },
      },
    ],
  }

  const sites = await payload.find({
    collection: 'sites',
    depth: 2,
    draft,
    limit: 1,
    pagination: false,
    where: draft
      ? identityWhere
      : {
          and: [
            identityWhere,
            {
              _status: {
                equals: 'published',
              },
            },
          ],
        },
  })

  if (sites.docs[0]) {
    return sites.docs[0]
  }

  // Unknown / unpublished specific site → no silent swap to another brand.
  if (siteSlug !== MAIN_SITE_SLUG) {
    return null
  }

  const fallback = await payload.find({
    collection: 'sites',
    depth: 2,
    draft,
    limit: 1,
    pagination: false,
    where: draft
      ? {
          slug: {
            equals: MAIN_SITE_SLUG,
          },
        }
      : {
          and: [
            {
              slug: {
                equals: MAIN_SITE_SLUG,
              },
            },
            {
              _status: {
                equals: 'published',
              },
            },
          ],
        },
  })

  return fallback.docs[0] ?? null
}

export const resolveSiteFromCurrentRequest = async (querySiteSlug?: null | string) => {
  const headerStore = await headers()

  const site = await resolveSiteFromRequest({
    headerSiteSlug: headerStore.get(FRONTEND_SITE_HEADER),
    host: headerStore.get('host'),
    querySiteSlug,
  })

  if (!site) {
    notFound()
  }

  return site
}

/**
 * Main + published sub-sites for the “Zdroj” filter on the main web
 * (own content + cross-posts). Empty on sub-sites.
 */
export const getSourceSites = async (currentSiteSlug: string) => {
  if (currentSiteSlug !== MAIN_SITE_SLUG) return []

  const draft = await isDraftPreview()
  const payload = await getPayloadClient()
  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    draft,
    limit: 20,
    pagination: false,
    sort: ['siteType', 'name'],
    where: draft
      ? undefined
      : {
          _status: { equals: 'published' },
        },
  })

  return sites.docs
}

export const getPublicationWhere = async ({
  includeCrossPosted = false,
  siteId,
}: {
  includeCrossPosted?: boolean
  siteId: number | string
}): Promise<Where> => {
  const draft = await isDraftPreview()

  const siteScope: Where[] = [{ site: { equals: siteId } }]

  if (includeCrossPosted) {
    if (draft) {
      siteScope.push({
        and: [
          { showOnMainSite: { equals: true } },
          { site: { not_equals: siteId } },
        ],
      })
    } else {
      // Only cross-post from published webs (content stays, public gone).
      const payload = await getPayloadClient()
      const publishedSources = await payload.find({
        collection: 'sites',
        depth: 0,
        limit: 50,
        pagination: false,
        where: {
          and: [
            { id: { not_equals: siteId } },
            { _status: { equals: 'published' } },
          ],
        },
      })
      const sourceIds = publishedSources.docs.map((doc) => doc.id)

      if (sourceIds.length) {
        siteScope.push({
          and: [
            { showOnMainSite: { equals: true } },
            { site: { in: sourceIds } },
          ],
        })
      }
    }
  }

  const andClauses: Where[] = [{ or: siteScope }]

  if (!draft) {
    andClauses.push({
      _status: {
        equals: 'published',
      },
    })
  }

  return { and: andClauses }
}

export const getListingWhere = async ({
  collection,
  includeCrossPosted = false,
  siteId,
}: {
  collection: 'aktuality' | 'kalendar' | 'projekty' | 'publikace' | 'stranky' | 'workshopy' | 'lide'
  includeCrossPosted?: boolean
  siteId: number | string
}) => {
  const baseWhere = await getPublicationWhere({ includeCrossPosted, siteId })
  const draft = await isDraftPreview()

  // Public listing hides future posts; live preview must still load them.
  if (collection === 'aktuality' && !draft) {
    return {
      and: [
        baseWhere,
        {
          publishedAt: {
            less_than_equal: new Date().toISOString(),
          },
        },
      ],
    } satisfies Where
  }

  return baseWhere
}

type TaxonomyDoc = { id: number | string; slug: string; title: string }

type ListingContentCollection = 'aktuality' | 'kalendar' | 'publikace' | 'workshopy'

/** AND-combine Where clauses (skips empty). */
export const whereAnd = (parts: (Where | null | undefined | false)[]): Where => {
  const list = parts.filter((part): part is Where => Boolean(part))
  if (!list.length) return {}
  if (list.length === 1) return list[0]!
  return { and: list }
}

/**
 * Distinct related ids on docs matching `where` (hasMany or single relationship).
 * Used for facet availability (gray out chips that yield 0 hits).
 */
export const findUsedRelationIds = async ({
  contentCollection,
  relationField,
  where,
}: {
  contentCollection: ListingContentCollection
  relationField: string
  where: Where
}): Promise<Set<string>> => {
  const payload = await getPayloadClient()
  const scoped = await payload.find({
    collection: contentCollection,
    depth: 0,
    limit: 2000,
    pagination: false,
    select: { [relationField]: true } as never,
    where,
  })

  const ids = new Set<string>()
  for (const doc of scoped.docs) {
    const value = (doc as Record<string, unknown>)[relationField]
    const items = Array.isArray(value) ? value : value != null ? [value] : []
    for (const item of items) {
      const id =
        item && typeof item === 'object' && item !== null && 'id' in item
          ? (item as { id: number | string }).id
          : (item as number | string)
      if (id != null && id !== '') ids.add(String(id))
    }
  }
  return ids
}

/**
 * Taxonomy chips that yield ≥1 matching doc under `where`.
 * Avoids empty filters + arbitrary `tags` list limits.
 */
export const findUsedTaxonomy = async ({
  contentCollection,
  relationCollection,
  relationField,
  where,
}: {
  contentCollection: ListingContentCollection
  relationCollection: 'tags' | 'publication-types' | 'workshop-audiences'
  relationField: string
  where: Where
}): Promise<TaxonomyDoc[]> => {
  const idSet = await findUsedRelationIds({ contentCollection, relationField, where })
  const ids = [...idSet]
  if (!ids.length) return []

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: relationCollection,
    depth: 0,
    limit: ids.length,
    pagination: false,
    sort: 'title',
    where: { id: { in: ids } },
  })

  return result.docs as TaxonomyDoc[]
}

/** Resolve taxonomy by slug (active URL filters that may be empty in current view). */
export const findTaxonomyBySlugs = async ({
  collection,
  slugs,
}: {
  collection: 'tags' | 'publication-types' | 'workshop-audiences'
  slugs: string[]
}): Promise<TaxonomyDoc[]> => {
  if (!slugs.length) return []
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection,
    depth: 0,
    limit: slugs.length,
    pagination: false,
    where: { slug: { in: slugs } },
  })
  return result.docs as TaxonomyDoc[]
}

/** Used chips + any active URL values (so empty filters stay clearable). */
export const mergeActiveTaxonomy = (
  used: TaxonomyDoc[],
  active: TaxonomyDoc[],
): TaxonomyDoc[] => {
  if (!active.length) return used
  const seen = new Set(used.map((item) => String(item.id)))
  const extra = active.filter((item) => !seen.has(String(item.id)))
  if (!extra.length) return used
  return [...used, ...extra].sort((a, b) => a.title.localeCompare(b.title, 'cs'))
}

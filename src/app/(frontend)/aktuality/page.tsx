import type { Metadata } from 'next'
import type { Where } from 'payload'

import { NewsCard } from '@/components/frontend/cards'
import { EmptyState, FilterBar, Pagination, type FilterChip } from '@/components/frontend/listing'
import { SiteShell } from '@/components/frontend/SiteShell'
import { hrefWith, queryList, toggleQueryValue, withSiteQuery } from '@/lib/content'
import { assertCollectionEnabled } from '@/lib/enabled-collections'
import {
  findTaxonomyBySlugs,
  findUsedRelationIds,
  findUsedTaxonomy,
  getListingWhere,
  getPayloadClient,
  getSourceSites,
  mergeActiveTaxonomy,
  resolveSiteFromCurrentRequest,
  whereAnd,
} from '@/lib/frontend'
import { buildPageMetadata } from '@/lib/metadata'

const PAGE_SIZE = 10

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>
}): Promise<Metadata> {
  const query = await searchParams
  const site = await resolveSiteFromCurrentRequest(query.site)
  return buildPageMetadata({ doc: { title: 'Aktuality' }, path: '/aktuality', site })
}

export default async function NewsListingPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    site?: string
    source?: string | string[]
    tag?: string | string[]
  }>
}) {
  const query = await searchParams
  const site = await resolveSiteFromCurrentRequest(query.site)
  assertCollectionEnabled(site, 'aktuality')
  const payload = await getPayloadClient()
  const page = Math.max(1, Number(query.page) || 1)

  const baseWhere = await getListingWhere({
    collection: 'aktuality',
    includeCrossPosted: site.slug === 'nazemi',
    siteId: site.id,
  })

  const activeTagSlugs = queryList(query.tag)
  const activeSourceSlugs = queryList(query.source)
  const [activeTags, sourceSites] = await Promise.all([
    findTaxonomyBySlugs({ collection: 'tags', slugs: activeTagSlugs }),
    getSourceSites(site.slug),
  ])
  const activeSources = sourceSites.filter((source) => activeSourceSlugs.includes(source.slug))

  const tagFilter: Where | null = activeTags.length
    ? { tags: { in: activeTags.map((tag) => tag.id) } }
    : null
  const sourceFilter: Where | null = activeSources.length
    ? { site: { in: activeSources.map((source) => source.id) } }
    : null

  const [usedTags, availableTags, availableSourceIds, news] = await Promise.all([
    findUsedTaxonomy({
      contentCollection: 'aktuality',
      relationCollection: 'tags',
      relationField: 'tags',
      where: baseWhere,
    }),
    findUsedTaxonomy({
      contentCollection: 'aktuality',
      relationCollection: 'tags',
      relationField: 'tags',
      where: whereAnd([baseWhere, sourceFilter]),
    }),
    findUsedRelationIds({
      contentCollection: 'aktuality',
      relationField: 'site',
      where: whereAnd([baseWhere, tagFilter]),
    }),
    payload.find({
      collection: 'aktuality',
      depth: 2,
      limit: PAGE_SIZE,
      page,
      sort: '-publishedAt',
      where: whereAnd([baseWhere, tagFilter, sourceFilter]),
    }),
  ])

  const tags = mergeActiveTaxonomy(usedTags, activeTags)
  const availableTagSlugs = new Set(availableTags.map((tag) => tag.slug))

  const current = { page: query.page, source: activeSourceSlugs, tag: activeTagSlugs }
  const allChip: FilterChip[] = [
    {
      active: !activeTags.length && !activeSources.length,
      href: hrefWith(
        '/aktuality',
        current,
        { page: undefined, source: undefined, tag: undefined },
        site.slug,
      ),
      label: 'Všechny aktuality',
      solid: true,
    },
  ]
  const tagChips: FilterChip[] = tags.map((tag) => {
    const active = activeTagSlugs.includes(tag.slug)
    return {
      active,
      clearable: true,
      disabled: !active && !availableTagSlugs.has(tag.slug),
      href: hrefWith(
        '/aktuality',
        current,
        { page: undefined, tag: toggleQueryValue(activeTagSlugs, tag.slug) },
        site.slug,
      ),
      label: tag.title,
    }
  })
  const sourceChips: FilterChip[] = sourceSites.map((source) => {
    const active = activeSourceSlugs.includes(source.slug)
    return {
      active,
      clearable: true,
      disabled: !active && !availableSourceIds.has(String(source.id)),
      href: hrefWith(
        '/aktuality',
        current,
        { page: undefined, source: toggleQueryValue(activeSourceSlugs, source.slug) },
        site.slug,
      ),
      label: `Aktuality ${source.name}`,
      source: true,
    }
  })

  return (
    <SiteShell
      breadcrumbs={[
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: withSiteQuery('/aktuality', site.slug), label: 'Aktuality' },
      ]}
      mainClassName="pt-content-top"
      site={site}
      stacked={false}
    >
      <div className="container section-stack">
        <section className="flex flex-col gap-grid" data-block="news">
          <h1 className="text-display text-ground">Aktuality</h1>
          <FilterBar
            ariaLabel="Filtrovat aktuality"
            primary={allChip}
            sections={[
              { label: 'Téma', chips: tagChips },
              { label: 'Zdroj', chips: sourceChips },
            ]}
          />
          {news.docs.length ? (
            <div className="grid min-w-0 grid-cols-1 gap-grid lg:grid-cols-3">
              {news.docs.map((item) => (
                <NewsCard item={item} key={item.id} siteSlug={site.slug} />
              ))}
            </div>
          ) : (
            <EmptyState>Pro tento filtr nemáme žádné aktuality.</EmptyState>
          )}
          <Pagination
            buildHref={(target) =>
              hrefWith('/aktuality', current, { page: target > 1 ? String(target) : undefined }, site.slug)
            }
            currentPage={news.page || page}
            totalPages={news.totalPages || 1}
          />
        </section>
      </div>
    </SiteShell>
  )
}

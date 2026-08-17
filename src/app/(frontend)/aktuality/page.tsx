import type { Where } from 'payload'
import type { Metadata } from 'next'

import { NewsCard } from '@/components/frontend/cards'
import { EmptyState, FilterBar, Pagination, type FilterChip } from '@/components/frontend/listing'
import { SiteShell } from '@/components/frontend/SiteShell'
import { hrefWith, queryList, toggleQueryValue, withSiteQuery } from '@/lib/content'
import { assertCollectionEnabled } from '@/lib/enabled-collections'
import {
  getListingWhere,
  getPayloadClient,
  getSourceSites,
  resolveSiteFromCurrentRequest,
} from '@/lib/frontend'
import { buildPageMetadata } from '@/lib/metadata'

const PAGE_SIZE = 9

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

  const filters: Where[] = [
    await getListingWhere({
      collection: 'aktuality',
      includeCrossPosted: site.slug === 'nazemi',
      siteId: site.id,
    }),
  ]

  const [tags, sourceSites] = await Promise.all([
    payload.find({
      collection: 'tags',
      depth: 0,
      limit: 30,
      pagination: false,
      sort: 'title',
    }),
    getSourceSites(site.slug),
  ])

  const activeTagSlugs = queryList(query.tag)
  const activeTags = tags.docs.filter((tag) => activeTagSlugs.includes(tag.slug))
  if (activeTags.length) {
    filters.push({ tags: { in: activeTags.map((tag) => tag.id) } })
  }

  const activeSourceSlugs = queryList(query.source)
  const activeSources = sourceSites.filter((source) => activeSourceSlugs.includes(source.slug))
  if (activeSources.length) {
    filters.push({ site: { in: activeSources.map((source) => source.id) } })
  }

  const news = await payload.find({
    collection: 'aktuality',
    depth: 2,
    limit: PAGE_SIZE,
    page,
    sort: '-publishedAt',
    where: { and: filters },
  })

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
  const tagChips: FilterChip[] = tags.docs.map((tag) => ({
    active: activeTagSlugs.includes(tag.slug),
    clearable: true,
    href: hrefWith(
      '/aktuality',
      current,
      { page: undefined, tag: toggleQueryValue(activeTagSlugs, tag.slug) },
      site.slug,
    ),
    label: tag.title,
  }))
  const sourceChips: FilterChip[] = sourceSites.map((source) => ({
    active: activeSourceSlugs.includes(source.slug),
    clearable: true,
    href: hrefWith(
      '/aktuality',
      current,
      { page: undefined, source: toggleQueryValue(activeSourceSlugs, source.slug) },
      site.slug,
    ),
    label: `Aktuality ${source.name}`,
    source: true,
  }))

  return (
    <SiteShell
      breadcrumbs={[
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: withSiteQuery('/aktuality', site.slug), label: 'Aktuality' },
      ]}
      mainClassName="pt-12 lg:pt-20"
      site={site}
      stacked={false}
    >
      <div className="container section-stack">
        <section className="flex flex-col gap-grid" data-block="news">
          <h1 className="text-display">Aktuality</h1>
          <FilterBar
            ariaLabel="Filtrovat aktuality"
            primary={allChip}
            sections={[
              { label: 'Téma', chips: tagChips },
              { label: 'Zdroj', chips: sourceChips },
            ]}
          />
          {news.docs.length ? (
            <div className="grid min-w-0 grid-cols-1 gap-grid lg:grid-cols-2">
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

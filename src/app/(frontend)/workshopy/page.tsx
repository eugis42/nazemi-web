import type { Where } from 'payload'
import type { Metadata } from 'next'

import { WorkshopCard } from '@/components/frontend/cards'
import { EmptyState, FilterBar, Pagination, type FilterChip } from '@/components/frontend/listing'
import { SiteShell } from '@/components/frontend/SiteShell'
import { hrefWith, queryList, toggleQueryValue, withSiteQuery } from '@/lib/content'
import { assertCollectionEnabled } from '@/lib/enabled-collections'
import {
  findTaxonomyBySlugs,
  findUsedTaxonomy,
  getListingWhere,
  getPayloadClient,
  mergeActiveTaxonomy,
  resolveSiteFromCurrentRequest,
} from '@/lib/frontend'
import { buildPageMetadata } from '@/lib/metadata'

const PAGE_SIZE = 50

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>
}): Promise<Metadata> {
  const query = await searchParams
  const site = await resolveSiteFromCurrentRequest(query.site)
  return buildPageMetadata({ doc: { title: 'Workshopy' }, path: '/workshopy', site })
}

export default async function WorkshopsPage({
  searchParams,
}: {
  searchParams: Promise<{
    audience?: string | string[]
    page?: string
    site?: string
    topic?: string | string[]
  }>
}) {
  const query = await searchParams
  const site = await resolveSiteFromCurrentRequest(query.site)
  assertCollectionEnabled(site, 'workshopy')
  const payload = await getPayloadClient()
  const page = Math.max(1, Number(query.page) || 1)

  const baseWhere = await getListingWhere({ collection: 'workshopy', siteId: site.id })
  const filters: Where[] = [baseWhere]

  const [usedAudiences, usedTopics] = await Promise.all([
    findUsedTaxonomy({
      contentCollection: 'workshopy',
      relationCollection: 'workshop-audiences',
      relationField: 'audiences',
      where: baseWhere,
    }),
    findUsedTaxonomy({
      contentCollection: 'workshopy',
      relationCollection: 'tags',
      relationField: 'topics',
      where: baseWhere,
    }),
  ])

  const activeAudienceSlugs = queryList(query.audience)
  const activeTopicSlugs = queryList(query.topic)
  const [activeAudiences, activeTopics] = await Promise.all([
    findTaxonomyBySlugs({ collection: 'workshop-audiences', slugs: activeAudienceSlugs }),
    findTaxonomyBySlugs({ collection: 'tags', slugs: activeTopicSlugs }),
  ])
  if (activeAudiences.length) {
    filters.push({ audiences: { in: activeAudiences.map((item) => item.id) } })
  }
  if (activeTopics.length) {
    filters.push({ topics: { in: activeTopics.map((item) => item.id) } })
  }
  const audiences = mergeActiveTaxonomy(usedAudiences, activeAudiences)
  const workshopTopics = mergeActiveTaxonomy(usedTopics, activeTopics)

  const workshops = await payload.find({
    collection: 'workshopy',
    depth: 2,
    limit: PAGE_SIZE,
    page,
    sort: 'title',
    where: { and: filters },
  })

  const current = {
    audience: activeAudienceSlugs,
    page: query.page,
    topic: activeTopicSlugs,
  }
  const allChip: FilterChip[] = [
    {
      active: !activeAudiences.length && !activeTopics.length,
      href: hrefWith(
        '/workshopy',
        current,
        { audience: undefined, page: undefined, topic: undefined },
        site.slug,
      ),
      label: 'Všechny workshopy',
      solid: true,
    },
  ]
  const audienceChips: FilterChip[] = audiences.map((item) => ({
    active: activeAudienceSlugs.includes(item.slug),
    clearable: true,
    href: hrefWith(
      '/workshopy',
      current,
      { audience: toggleQueryValue(activeAudienceSlugs, item.slug), page: undefined },
      site.slug,
    ),
    label: item.title,
  }))
  const topicChips: FilterChip[] = workshopTopics.map((item) => ({
    active: activeTopicSlugs.includes(item.slug),
    clearable: true,
    href: hrefWith(
      '/workshopy',
      current,
      { page: undefined, topic: toggleQueryValue(activeTopicSlugs, item.slug) },
      site.slug,
    ),
    label: item.title,
  }))

  return (
    <SiteShell
      breadcrumbs={[
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: withSiteQuery('/workshopy', site.slug), label: 'Workshopy' },
      ]}
      mainClassName="pt-12 lg:pt-20"
      site={site}
      stacked={false}
    >
      <div className="container section-stack">
        <section className="flex flex-col gap-grid" data-block="workshops">
          <h1 className="text-display text-ground">Workshopy</h1>
          <FilterBar
            ariaLabel="Filtrovat workshopy"
            primary={allChip}
            sections={[
              { label: 'Cílová skupina', chips: audienceChips },
              { label: 'Téma', chips: topicChips },
            ]}
          />
          {workshops.docs.length ? (
            <div className="grid grid-cols-1 items-start gap-grid lg:grid-cols-2 lg:items-stretch">
              {workshops.docs.map((item) => (
                <WorkshopCard item={item} key={item.id} siteSlug={site.slug} />
              ))}
            </div>
          ) : (
            <EmptyState>Pro tento filtr nemáme žádné workshopy.</EmptyState>
          )}
          <Pagination
            buildHref={(target) =>
              hrefWith('/workshopy', current, { page: target > 1 ? String(target) : undefined }, site.slug)
            }
            currentPage={workshops.page || page}
            totalPages={workshops.totalPages}
          />
        </section>
      </div>
    </SiteShell>
  )
}

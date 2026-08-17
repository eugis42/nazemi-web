import type { Where } from 'payload'
import type { Metadata } from 'next'

import { BookCard } from '@/components/frontend/cards'
import {
  EmptyState,
  FilterBar,
  Pagination,
  type BreadcrumbItem,
  type FilterChip,
} from '@/components/frontend/listing'
import { SiteShell } from '@/components/frontend/SiteShell'
import {
  hrefWith,
  menuParentForHref,
  queryList,
  toggleQueryValue,
  withSiteQuery,
} from '@/lib/content'
import { assertCollectionEnabled } from '@/lib/enabled-collections'
import { getListingWhere, getPayloadClient, resolveSiteFromCurrentRequest } from '@/lib/frontend'
import { buildPageMetadata } from '@/lib/metadata'

const PAGE_SIZE = 16
const METODIKY_SLUG = 'metodika'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>
}): Promise<Metadata> {
  const query = await searchParams
  const site = await resolveSiteFromCurrentRequest(query.site)
  return buildPageMetadata({ doc: { title: 'Publikace' }, path: '/publikace', site })
}

export default async function PublikacePage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string | string[]
    page?: string
    site?: string
    topic?: string | string[]
  }>
}) {
  const query = await searchParams
  const site = await resolveSiteFromCurrentRequest(query.site)
  assertCollectionEnabled(site, 'publikace')
  const payload = await getPayloadClient()
  const page = Math.max(1, Number(query.page) || 1)

  const baseWhere = await getListingWhere({
    collection: 'publikace',
    includeCrossPosted: site.slug === 'nazemi',
    siteId: site.id,
  })
  const filters: Where[] = [baseWhere]

  const [types, tags, scoped] = await Promise.all([
    payload.find({
      collection: 'publication-types',
      depth: 0,
      limit: 30,
      pagination: false,
      sort: 'title',
    }),
    payload.find({ collection: 'tags', depth: 0, limit: 30, pagination: false, sort: 'title' }),
    // Topic chips only list tags that publications on this site actually use.
    payload.find({
      collection: 'publikace',
      depth: 0,
      limit: 500,
      pagination: false,
      select: { topics: true },
      where: baseWhere,
    }),
  ])

  const usedTopicIds = new Set(
    scoped.docs.flatMap((doc) =>
      (doc.topics || []).map((topic) => (typeof topic === 'object' ? topic.id : topic)),
    ),
  )
  const publicationTopics = tags.docs.filter((tag) => usedTopicIds.has(tag.id))

  const activeTypeSlugs = queryList(query.filter)
  const activeTypes = types.docs.filter((type) => activeTypeSlugs.includes(type.slug))
  if (activeTypes.length) {
    filters.push({ types: { in: activeTypes.map((type) => type.id) } })
  }

  const activeTopicSlugs = queryList(query.topic)
  const activeTopics = publicationTopics.filter((topic) => activeTopicSlugs.includes(topic.slug))
  if (activeTopics.length) {
    filters.push({ topics: { in: activeTopics.map((topic) => topic.id) } })
  }

  const publications = await payload.find({
    collection: 'publikace',
    depth: 2,
    limit: PAGE_SIZE,
    page,
    sort: 'title',
    where: { and: filters },
  })

  const isMetodiky = activeTypeSlugs.length === 1 && activeTypeSlugs[0] === METODIKY_SLUG
  const heading = isMetodiky ? 'Metodiky' : 'Publikace'
  const listingHref = isMetodiky ? `/publikace?filter=${METODIKY_SLUG}` : '/publikace'

  const current = { filter: activeTypeSlugs, page: query.page, topic: activeTopicSlugs }
  const allChip: FilterChip[] = [
    {
      active: !activeTypes.length && !activeTopics.length,
      href: hrefWith(
        '/publikace',
        current,
        { filter: undefined, page: undefined, topic: undefined },
        site.slug,
      ),
      label: 'Všechny publikace',
      solid: true,
    },
  ]
  const typeChips: FilterChip[] = types.docs.map((type) => ({
    active: activeTypeSlugs.includes(type.slug),
    clearable: true,
    href: hrefWith(
      '/publikace',
      current,
      { filter: toggleQueryValue(activeTypeSlugs, type.slug), page: undefined },
      site.slug,
    ),
    label: type.title,
  }))
  const topicChips: FilterChip[] = publicationTopics.map((topic) => ({
    active: activeTopicSlugs.includes(topic.slug),
    clearable: true,
    href: hrefWith(
      '/publikace',
      current,
      { page: undefined, topic: toggleQueryValue(activeTopicSlugs, topic.slug) },
      site.slug,
    ),
    label: topic.title,
  }))

  const menuMatch = menuParentForHref(site.mainMenu, listingHref)
  const breadcrumbs: BreadcrumbItem[] = [
    { href: withSiteQuery('/', site.slug), label: 'Domů' },
    ...(menuMatch
      ? [
          { href: withSiteQuery(menuMatch.parent.href, site.slug), label: menuMatch.parent.label },
          {
            href: withSiteQuery(listingHref, site.slug),
            label: heading,
            siblings: menuMatch.siblings.map((sibling) => ({
              href: withSiteQuery(sibling.href, site.slug),
              label: sibling.label,
            })),
          },
        ]
      : [{ href: withSiteQuery(listingHref, site.slug), label: heading }]),
  ]

  return (
    <SiteShell breadcrumbs={breadcrumbs} mainClassName="pt-12 lg:pt-20" site={site} stacked={false}>
      <div className="container section-stack">
        <section className="flex flex-col gap-grid" data-block="publications">
          <h1 className="text-display">{heading}</h1>
          <FilterBar
            ariaLabel="Filtrovat publikace"
            primary={allChip}
            sections={[
              { label: 'Typ publikace', chips: typeChips },
              { label: 'Téma', chips: topicChips },
            ]}
          />
          {publications.docs.length ? (
            <div className="grid min-w-0 grid-cols-1 items-start gap-x-8 gap-y-20 sm:grid-cols-2 sm:items-stretch lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-10 xl:gap-y-24">
              {publications.docs.map((item) => (
                <BookCard item={item} key={item.id} siteSlug={site.slug} />
              ))}
            </div>
          ) : (
            <EmptyState>Pro tento filtr nemáme žádné publikace.</EmptyState>
          )}
          <Pagination
            buildHref={(target) =>
              hrefWith('/publikace', current, { page: target > 1 ? String(target) : undefined }, site.slug)
            }
            currentPage={publications.page || page}
            totalPages={publications.totalPages || 1}
          />
        </section>
      </div>
    </SiteShell>
  )
}

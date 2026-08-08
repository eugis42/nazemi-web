import type { Where } from 'payload'
import type { Metadata } from 'next'

import { EventCard } from '@/components/frontend/cards'
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
  return buildPageMetadata({ doc: { title: 'Kalendář' }, path: '/kalendar', site })
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    site?: string
    source?: string | string[]
    tag?: string | string[]
    time?: string
    workshop?: string
  }>
}) {
  const query = await searchParams
  const site = await resolveSiteFromCurrentRequest(query.site)
  assertCollectionEnabled(site, 'kalendar')
  const payload = await getPayloadClient()
  const page = Math.max(1, Number(query.page) || 1)
  const past = query.time === 'past'
  const now = new Date().toISOString()

  const filters: Where[] = [
    await getListingWhere({
      collection: 'kalendar',
      includeCrossPosted: site.slug === 'nazemi',
      siteId: site.id,
    }),
    past ? { startDate: { less_than: now } } : { startDate: { greater_than_equal: now } },
  ]

  let workshopTitle: string | null = null
  if (query.workshop) {
    const workshopResult = await payload.find({
      collection: 'workshopy',
      depth: 0,
      limit: 1,
      pagination: false,
      where: {
        and: [
          await getListingWhere({ collection: 'workshopy', siteId: site.id }),
          { slug: { equals: query.workshop } },
        ],
      },
    })
    const workshop = workshopResult.docs[0]
    if (workshop) {
      workshopTitle = workshop.title
      filters.push({ workshop: { equals: workshop.id } })
    }
  }

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

  const events = await payload.find({
    collection: 'kalendar',
    depth: 2,
    limit: PAGE_SIZE,
    page,
    sort: past ? '-startDate' : 'startDate',
    where: { and: filters },
  })

  const current = {
    page: query.page,
    source: activeSourceSlugs,
    tag: activeTagSlugs,
    time: query.time,
    workshop: query.workshop,
  }
  const timeChips: FilterChip[] = [
    {
      active: !past,
      href: hrefWith('/kalendar', current, { page: undefined, time: undefined }, site.slug),
      label: 'Nadcházející události',
      solid: true,
    },
    {
      active: past,
      href: hrefWith('/kalendar', current, { page: undefined, time: 'past' }, site.slug),
      label: 'Minulé události',
      solid: true,
    },
  ]
  const tagChips: FilterChip[] = tags.docs.map((tag) => ({
    active: activeTagSlugs.includes(tag.slug),
    clearable: true,
    href: hrefWith(
      '/kalendar',
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
      '/kalendar',
      current,
      { page: undefined, source: toggleQueryValue(activeSourceSlugs, source.slug) },
      site.slug,
    ),
    label: `Události ${source.name}`,
    source: true,
  }))

  return (
    <SiteShell
      breadcrumbs={[
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: withSiteQuery('/kalendar', site.slug), label: 'Kalendář' },
      ]}
      mainClassName="pt-12 lg:pt-20"
      site={site}
      stacked={false}
    >
      <div className="container section-stack">
        <section className="flex flex-col gap-grid" data-block="calendar">
          <h1 className="text-display">Kalendář</h1>
          {workshopTitle ? (
            <p className="text-body-inter">
              Termíny workshopu <strong>{workshopTitle}</strong>{' '}
              <a
                className="underline"
                href={hrefWith('/kalendar', current, { page: undefined, workshop: undefined }, site.slug)}
              >
                Zrušit filtr
              </a>
            </p>
          ) : null}
          <FilterBar
            ariaLabel="Filtrovat události"
            groups={[timeChips, tagChips, sourceChips]}
          />
          {events.docs.length ? (
            <div className="grid grid-cols-1 gap-grid lg:grid-cols-3">
              {events.docs.map((item) => (
                <EventCard item={item} key={item.id} siteSlug={site.slug} />
              ))}
            </div>
          ) : (
            <EmptyState>Pro tento filtr nemáme žádné události.</EmptyState>
          )}
          <Pagination
            buildHref={(target) =>
              hrefWith('/kalendar', current, { page: target > 1 ? String(target) : undefined }, site.slug)
            }
            currentPage={events.page || page}
            totalPages={events.totalPages || 1}
          />
        </section>
      </div>
    </SiteShell>
  )
}

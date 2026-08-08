import type { Where } from 'payload'
import type { Metadata } from 'next'

import {
  SEARCH_TYPE_FILTERS,
  SearchForm,
  SearchResultRow,
  SearchTypeFilterBar,
} from '@/components/frontend/SearchResults'
import { EmptyState, Pagination } from '@/components/frontend/listing'
import { SiteShell } from '@/components/frontend/SiteShell'
import { hrefWith, withSiteQuery } from '@/lib/content'
import { querySearchTerms } from '@/lib/czech-stem'
import { getPayloadClient, resolveSiteFromCurrentRequest } from '@/lib/frontend'
import { buildPageMetadata } from '@/lib/metadata'

const PAGE_SIZE = 12

const ALLOWED_TYPES = new Set(SEARCH_TYPE_FILTERS.map((item) => item.value).filter(Boolean))

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; site?: string }>
}): Promise<Metadata> {
  const query = await searchParams
  const site = await resolveSiteFromCurrentRequest(query.site)
  const q = query.q?.trim()
  return buildPageMetadata({
    doc: {
      title: q ? `Vyhledávání: ${q}` : 'Vyhledávání',
      description: q
        ? `Výsledky vyhledávání pro „${q}“ na webu ${site.name}.`
        : `Vyhledávání na webu ${site.name}.`,
    },
    path: '/hledat',
    site,
  })
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    q?: string
    site?: string
    type?: string
  }>
}) {
  const query = await searchParams
  const site = await resolveSiteFromCurrentRequest(query.site)
  const payload = await getPayloadClient()
  const page = Math.max(1, Number(query.page) || 1)
  const q = (query.q || '').trim()
  const type = query.type && ALLOWED_TYPES.has(query.type) ? query.type : ''

  const filters: Where[] = [
    {
      site: {
        equals: site.id,
      },
    },
  ]

  const searchTermFilters: Where[] = []
  if (q) {
    const terms = querySearchTerms(q)
    if (terms.length) {
      searchTermFilters.push({
        and: terms.map((term) => ({
          searchText: {
            contains: term,
          },
        })),
      })
    }
  }

  if (type) {
    filters.push({
      collectionSlug: {
        equals: type,
      },
    })
  }

  filters.push(...searchTermFilters)

  const baseWhere: Where = {
    and: [
      { site: { equals: site.id } },
      ...searchTermFilters,
    ],
  }

  const [results, typeCounts] = q
    ? await Promise.all([
        payload.find({
          collection: 'search',
          depth: 0,
          limit: PAGE_SIZE,
          page,
          sort: 'priority',
          where: { and: filters },
        }),
        Promise.all(
          SEARCH_TYPE_FILTERS.map(async (item) => {
            const where: Where = item.value
              ? {
                  and: [
                    ...(Array.isArray(baseWhere.and) ? baseWhere.and : [baseWhere]),
                    { collectionSlug: { equals: item.value } },
                  ],
                }
              : baseWhere
            const { totalDocs } = await payload.count({
              collection: 'search',
              where,
            })
            return [item.value, totalDocs] as const
          }),
        ),
      ])
    : [null, [] as const]

  const countByType = new Map(typeCounts)

  const current = {
    page: query.page,
    q: q || undefined,
    type: type || undefined,
  }

  const typeChips = SEARCH_TYPE_FILTERS.map((item) => {
    const count = countByType.get(item.value) ?? 0
    return {
      active: item.value === type || (!type && !item.value),
      collection: item.value,
      count,
      disabled: count === 0,
      href: hrefWith(
        '/hledat',
        current,
        {
          page: undefined,
          type: item.value || undefined,
        },
        site.slug,
      ),
      label: item.label,
    }
  })

  return (
    <SiteShell
      breadcrumbs={[
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: withSiteQuery('/hledat', site.slug), label: 'Vyhledávání' },
      ]}
      mainClassName="pt-12 lg:pt-20"
      site={site}
      stacked={false}
    >
      <div className="container section-stack">
        <section className="flex flex-col gap-grid" data-block="search">
          <h1 className="text-display">Vyhledávání</h1>
          <SearchForm q={q} siteSlug={site.slug} type={type} />
          {q ? (
            <p className="text-body-inter text-ground/80">
              Výsledky pro „{q}“
              {results ? ` (${results.totalDocs})` : null}
            </p>
          ) : (
            <EmptyState>Zadejte hledaný výraz a stiskněte Hledat.</EmptyState>
          )}
          {q ? <SearchTypeFilterBar chips={typeChips} /> : null}
          {q && results ? (
            results.docs.length ? (
              <div className="flex flex-col gap-0" data-component="search-results">
                {results.docs.map((item) => (
                  <SearchResultRow item={item} key={item.id} query={q} siteSlug={site.slug} />
                ))}
              </div>
            ) : (
              <EmptyState>Nic jsme nenašli. Zkuste jiný výraz nebo filtr typu.</EmptyState>
            )
          ) : null}
          {results ? (
            <Pagination
              buildHref={(target) =>
                hrefWith(
                  '/hledat',
                  current,
                  { page: target > 1 ? String(target) : undefined },
                  site.slug,
                )
              }
              currentPage={results.page || page}
              totalPages={results.totalPages || 1}
            />
          ) : null}
        </section>
      </div>
    </SiteShell>
  )
}

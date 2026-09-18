import type { Metadata } from 'next'
import { headers } from 'next/headers'
import type { Where } from 'payload'

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
import { keywordsFromPathname } from '@/lib/not-found-search'
import { PATHNAME_HEADER } from '@/lib/site-context'

const PAGE_SIZE = 12

export async function generateMetadata(): Promise<Metadata> {
  const site = await resolveSiteFromCurrentRequest()
  return {
    ...buildPageMetadata({
      doc: {
        description: 'Stránka nenalezena. Zkuste vyhledávání na webu NaZemi.',
        title: 'Stránka nenalezena',
      },
      path: '/404',
      site,
    }),
    robots: { index: false, follow: true },
  }
}

export default async function NotFound() {
  const site = await resolveSiteFromCurrentRequest()
  const headerStore = await headers()
  const pathname = headerStore.get(PATHNAME_HEADER) || ''
  const guessed = keywordsFromPathname(pathname)

  const payload = await getPayloadClient()
  let q = ''
  let results: Awaited<ReturnType<typeof payload.find>> | null = null
  let typeCounts: readonly (readonly [string, number])[] = []

  if (guessed) {
    const terms = querySearchTerms(guessed)
    const searchTermFilters: Where[] = terms.length
      ? [
          {
            and: terms.map((term) => ({
              searchText: { contains: term },
            })),
          },
        ]
      : []

    if (searchTermFilters.length) {
      const baseWhere: Where = {
        and: [{ site: { equals: site.id } }, ...searchTermFilters],
      }

      const [found, counts] = await Promise.all([
        payload.find({
          collection: 'search',
          depth: 0,
          limit: PAGE_SIZE,
          page: 1,
          sort: 'priority',
          where: baseWhere,
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

      if (found.totalDocs > 0) {
        q = guessed
        results = found
        typeCounts = counts
      }
    }
  }

  const countByType = new Map(typeCounts)
  const current = { q: q || undefined }
  const typeChips = SEARCH_TYPE_FILTERS.map((item) => {
    const count = countByType.get(item.value) ?? 0
    return {
      active: !item.value,
      collection: item.value,
      count,
      disabled: count === 0,
      href: hrefWith(
        '/hledat',
        current,
        { page: undefined, type: item.value || undefined },
        site.slug,
      ),
      label: item.label,
    }
  })

  return (
    <SiteShell
      breadcrumbs={[
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: '#', label: '404' },
      ]}
      mainClassName="pt-12 lg:pt-20"
      site={site}
      stacked={false}
    >
      <div className="container section-stack">
        <section className="flex flex-col gap-grid" data-block="not-found">
          <div className="flex flex-col gap-3">
            <h1 className="text-display text-ground">
              Obsah, který hledáte se pravděpodobně jen přesunul
            </h1>
            <p className="font-saans text-section-title text-ground/80">Zkuste naše vyhledávání</p>
          </div>

          <SearchForm q={q} siteSlug={site.slug} type="" />

          {q ? (
            <p className="text-body-inter text-ground/80">
              Výsledky pro „{q}“
              {results ? ` (${results.totalDocs})` : null}
            </p>
          ) : null}

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

          {results && results.totalPages > 1 ? (
            <Pagination
              buildHref={(target) =>
                hrefWith(
                  '/hledat',
                  current,
                  { page: target > 1 ? String(target) : undefined },
                  site.slug,
                )
              }
              currentPage={results.page || 1}
              totalPages={results.totalPages || 1}
            />
          ) : null}
        </section>
      </div>
    </SiteShell>
  )
}

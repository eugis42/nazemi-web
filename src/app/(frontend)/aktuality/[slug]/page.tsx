import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { NewsArticleHero } from '@/components/frontend/details'
import { AktualityLivePreview } from '@/components/frontend/LivePreviewDetailViews'
import { SiteShell } from '@/components/frontend/SiteShell'
import { withSiteQuery } from '@/lib/content'
import { assertCollectionEnabled } from '@/lib/enabled-collections'
import {
  draftFindOptions,
  getListingWhere,
  getPayloadClient,
  resolveSiteFromCurrentRequest,
} from '@/lib/frontend'
import { buildPageMetadata } from '@/lib/metadata'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ site?: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { site: querySiteSlug } = await searchParams
  const site = await resolveSiteFromCurrentRequest(querySiteSlug)
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'aktuality',
    depth: 1,
    limit: 1,
    pagination: false,
    ...(await draftFindOptions()),
    where: {
      and: [
        await getListingWhere({
          collection: 'aktuality',
          includeCrossPosted: site.slug === 'nazemi',
          siteId: site.id,
        }),
        { slug: { equals: slug } },
      ],
    },
  })
  const doc = result.docs[0]
  return buildPageMetadata({
    doc: doc || { title: 'Aktualita' },
    path: `/aktuality/${slug}`,
    site,
  })
}

export default async function NewsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ site?: string }>
}) {
  const { slug } = await params
  const { site: querySiteSlug } = await searchParams
  const site = await resolveSiteFromCurrentRequest(querySiteSlug)
  assertCollectionEnabled(site, 'aktuality')
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'aktuality',
    depth: 2,
    limit: 1,
    pagination: false,
    ...(await draftFindOptions()),
    where: {
      and: [
        await getListingWhere({
          collection: 'aktuality',
          includeCrossPosted: site.slug === 'nazemi',
          siteId: site.id,
        }),
        { slug: { equals: slug } },
      ],
    },
  })

  const doc = result.docs[0]
  if (!doc) notFound()

  return (
    <SiteShell
      beforeMain={<NewsArticleHero item={doc} />}
      breadcrumbs={[
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: withSiteQuery('/aktuality', site.slug), label: 'Aktuality' },
        { href: withSiteQuery(`/aktuality/${doc.slug}`, site.slug), label: doc.title },
      ]}
      mainClassName="pt-16 lg:pt-24"
      site={site}
      stacked={false}
    >
      <AktualityLivePreview
        currentSiteSlug={site.slug}
        initialData={doc}
        skipBigHero
        skipTopPad
      />
    </SiteShell>
  )
}

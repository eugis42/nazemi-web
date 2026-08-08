import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { EventOverview } from '@/components/frontend/details'
import { KalendarLivePreview } from '@/components/frontend/LivePreviewDetailViews'
import { SiteShell } from '@/components/frontend/SiteShell'
import { withSiteQuery } from '@/lib/content'
import { assertCollectionEnabled } from '@/lib/enabled-collections'
import { draftFindOptions,
  getListingWhere,
  getPayloadClient,
  resolveSiteFromCurrentRequest } from '@/lib/frontend'
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
    collection: 'kalendar',
    depth: 1,
    limit: 1,
    pagination: false,
    ...(await draftFindOptions()),
    where: {
      and: [
        await getListingWhere({
          collection: 'kalendar',
          includeCrossPosted: site.slug === 'nazemi',
          siteId: site.id,
        }),
        { slug: { equals: slug } },
      ],
    },
  })
  return buildPageMetadata({
    doc: result.docs[0] || { title: 'Událost' },
    path: `/kalendar/${slug}`,
    site,
  })
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ site?: string }>
}) {
  const { slug } = await params
  const { site: querySiteSlug } = await searchParams
  const site = await resolveSiteFromCurrentRequest(querySiteSlug)
  assertCollectionEnabled(site, 'kalendar')
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'kalendar',
    depth: 2,
    limit: 1,
    pagination: false,
    ...(await draftFindOptions()),
    where: {
      and: [
        await getListingWhere({
          collection: 'kalendar',
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
      beforeMain={<EventOverview item={doc} siteSlug={site.slug} />}
      breadcrumbs={[
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: withSiteQuery('/kalendar', site.slug), label: 'Kalendář' },
        { href: withSiteQuery(`/kalendar/${doc.slug}`, site.slug), label: doc.title },
      ]}
      mainClassName="pt-content-top"
      site={site}
      stacked={false}
    >
      <KalendarLivePreview currentSiteSlug={site.slug} initialData={doc} />
    </SiteShell>
  )
}

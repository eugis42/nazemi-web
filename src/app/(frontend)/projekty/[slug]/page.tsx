import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { ProjectHeader } from '@/components/frontend/cards'
import { ProjektLivePreview } from '@/components/frontend/LivePreviewDetailViews'
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
    collection: 'projekty',
    depth: 1,
    limit: 1,
    pagination: false,
    ...(await draftFindOptions()),
    where: {
      and: [
        await getListingWhere({ collection: 'projekty', siteId: site.id }),
        { slug: { equals: slug } },
      ],
    },
  })
  return buildPageMetadata({
    doc: result.docs[0] || { title: 'Projekt' },
    path: `/projekty/${slug}`,
    site,
  })
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ site?: string }>
}) {
  const { slug } = await params
  const { site: querySiteSlug } = await searchParams
  const site = await resolveSiteFromCurrentRequest(querySiteSlug)
  assertCollectionEnabled(site, 'projekty')
  const payload = await getPayloadClient()
  const listingWhere = await getListingWhere({
    collection: 'projekty',
    siteId: site.id,
  })
  const [result, siblings] = await Promise.all([
    payload.find({
      collection: 'projekty',
      depth: 2,
      limit: 1,
      pagination: false,
      ...(await draftFindOptions()),
      where: {
        and: [listingWhere, { slug: { equals: slug } }],
      },
    }),
    payload.find({
      collection: 'projekty',
      depth: 0,
      limit: 100,
      pagination: false,
      sort: 'title',
      where: listingWhere,
    }),
  ])

  const doc = result.docs[0]
  if (!doc) notFound()

  return (
    <SiteShell
      beforeMain={<ProjectHeader item={doc} />}
      breadcrumbs={[
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: withSiteQuery('/projekty', site.slug), label: 'Projekty' },
        {
          href: withSiteQuery(`/projekty/${doc.slug}`, site.slug),
          label: doc.title,
          siblings: siblings.docs.map((item) => ({
            href: withSiteQuery(`/projekty/${item.slug}`, site.slug),
            label: item.title,
          })),
        },
      ]}
      mainClassName="pt-content-top"
      site={site}
      stacked={false}
    >
      <ProjektLivePreview initialData={doc} />
    </SiteShell>
  )
}

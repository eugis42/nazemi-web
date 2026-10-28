import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import {
  DocLivePreviewProvider,
  WorkshopHeaderLivePreview,
  WorkshopLivePreview,
} from '@/components/frontend/LivePreviewDetailViews'
import { SiteShell } from '@/components/frontend/SiteShell'
import { withSiteQuery } from '@/lib/content'
import { assertCollectionEnabled } from '@/lib/enabled-collections'
import { draftFindOptions,
  getListingWhere,
  getPayloadClient,
  resolveSiteFromCurrentRequest } from '@/lib/frontend'
import { resolveAdminEditHref } from '@/lib/frontend-edit'
import { upcomingScheduledWorkshopsJoin } from '@/lib/menu-relation-picker'
import { buildPageMetadata } from '@/lib/metadata'
import { MAIN_SITE_SLUG } from '@/lib/site-context'

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
    collection: 'workshopy',
    depth: 1,
    limit: 1,
    pagination: false,
    ...(await draftFindOptions()),
    where: {
      and: [
        await getListingWhere({
          collection: 'workshopy',
          includeCrossPosted: site.slug === 'nazemi',
          siteId: site.id,
        }),
        { slug: { equals: slug } },
      ],
    },
  })
  return buildPageMetadata({
    doc: result.docs[0] || { title: 'Workshop' },
    path: `/workshopy/${slug}`,
    site,
  })
}

export default async function WorkshopDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ site?: string }>
}) {
  const { slug } = await params
  const { site: querySiteSlug } = await searchParams
  const site = await resolveSiteFromCurrentRequest(querySiteSlug)
  assertCollectionEnabled(site, 'workshopy')
  const payload = await getPayloadClient()
  const listingWhere = await getListingWhere({
    collection: 'workshopy',
    includeCrossPosted: site.slug === 'nazemi',
    siteId: site.id,
  })
  const siblingsWhere = await getListingWhere({
    collection: 'workshopy',
    siteId: site.id,
  })
  const [result, siblings] = await Promise.all([
    payload.find({
      collection: 'workshopy',
      depth: 2,
      joins: upcomingScheduledWorkshopsJoin(),
      limit: 1,
      pagination: false,
      ...(await draftFindOptions()),
      where: {
        and: [listingWhere, { slug: { equals: slug } }],
      },
    }),
    payload.find({
      collection: 'workshopy',
      depth: 0,
      limit: 100,
      pagination: false,
      sort: site.slug === MAIN_SITE_SLUG ? 'mainSiteOrder' : '_order',
      where: siblingsWhere,
    }),
  ])

  const doc = result.docs[0]
  if (!doc) notFound()
  const editHref = await resolveAdminEditHref('workshopy', doc.id)

  return (
    <DocLivePreviewProvider initialData={doc}>
      <SiteShell
        beforeMain={<WorkshopHeaderLivePreview siteSlug={site.slug} />}
        breadcrumbs={[
          { href: withSiteQuery('/', site.slug), label: 'Domů' },
          { href: withSiteQuery('/workshopy', site.slug), label: 'Workshopy' },
          {
            href: withSiteQuery(`/workshopy/${doc.slug}`, site.slug),
            label: doc.title,
            siblings: siblings.docs.map((item) => ({
              href: withSiteQuery(`/workshopy/${item.slug}`, site.slug),
              label: item.title,
            })),
          },
        ]}
        editHref={editHref}
        site={site}
        stacked={false}
      >
        <WorkshopLivePreview currentSiteSlug={site.slug} />
      </SiteShell>
    </DocLivePreviewProvider>
  )
}

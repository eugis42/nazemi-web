import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { PersonDetail } from '@/components/frontend/details'
import { SiteShell } from '@/components/frontend/SiteShell'
import { withSiteQuery } from '@/lib/content'
import { assertCollectionEnabled } from '@/lib/enabled-collections'
import {
  draftFindOptions,
  getListingWhere,
  getPayloadClient,
  resolveSiteFromCurrentRequest,
} from '@/lib/frontend'
import { resolveAdminEditHref } from '@/lib/frontend-edit'
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
    collection: 'lide',
    depth: 1,
    limit: 1,
    pagination: false,
    ...(await draftFindOptions()),
    where: {
      and: [
        await getListingWhere({ collection: 'lide', siteId: site.id }),
        { slug: { equals: slug } },
      ],
    },
  })
  const doc = result.docs[0]
  return buildPageMetadata({
    doc: doc
      ? {
          description: doc.role,
          title: doc.name,
        }
      : { title: 'Člověk' },
    path: `/lide/${slug}`,
    site,
  })
}

export default async function PersonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ site?: string }>
}) {
  const { slug } = await params
  const { site: querySiteSlug } = await searchParams
  const site = await resolveSiteFromCurrentRequest(querySiteSlug)
  assertCollectionEnabled(site, 'lide')
  const payload = await getPayloadClient()
  const listingWhere = await getListingWhere({ collection: 'lide', siteId: site.id })
  const [result, siblings] = await Promise.all([
    payload.find({
      collection: 'lide',
      depth: 2,
      limit: 1,
      pagination: false,
      ...(await draftFindOptions()),
      where: {
        and: [listingWhere, { slug: { equals: slug } }],
      },
    }),
    payload.find({
      collection: 'lide',
      depth: 0,
      limit: 100,
      pagination: false,
      sort: 'sortOrder',
      where: listingWhere,
    }),
  ])

  const doc = result.docs[0]
  if (!doc) notFound()
  const editHref = await resolveAdminEditHref('lide', doc.id)

  return (
    <SiteShell
      breadcrumbs={[
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: withSiteQuery('/kontakt', site.slug), label: 'Kontakt' },
        {
          href: withSiteQuery(`/lide/${doc.slug}`, site.slug),
          label: doc.name,
          siblings: siblings.docs
            .filter((item) => item.slug)
            .map((item) => ({
              href: withSiteQuery(`/lide/${item.slug}`, site.slug),
              label: item.name,
            })),
        },
      ]}
      editHref={editHref}
      mainClassName="pt-content-top"
      site={site}
      stacked={false}
    >
      <PersonDetail item={doc} siteSlug={site.slug} />
    </SiteShell>
  )
}

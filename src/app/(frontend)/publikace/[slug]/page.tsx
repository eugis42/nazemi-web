import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { PublicationBody, PublicationHeader } from '@/components/frontend/details'
import { SiteShell } from '@/components/frontend/SiteShell'
import { menuParentForHref, withSiteQuery } from '@/lib/content'
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
    collection: 'publikace',
    depth: 1,
    limit: 1,
    pagination: false,
    ...(await draftFindOptions()),
    where: {
      and: [
        await getListingWhere({
          collection: 'publikace',
          includeCrossPosted: site.slug === 'nazemi',
          siteId: site.id,
        }),
        { slug: { equals: slug } },
      ],
    },
  })
  return buildPageMetadata({
    doc: result.docs[0] || { title: 'Publikace' },
    path: `/publikace/${slug}`,
    site,
  })
}

export default async function PublikaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ site?: string }>
}) {
  const { slug } = await params
  const { site: querySiteSlug } = await searchParams
  const site = await resolveSiteFromCurrentRequest(querySiteSlug)
  assertCollectionEnabled(site, 'publikace')
  const payload = await getPayloadClient()
  const listingWhere = await getListingWhere({
    collection: 'publikace',
    includeCrossPosted: site.slug === 'nazemi',
    siteId: site.id,
  })
  const [result, siblings] = await Promise.all([
    payload.find({
      collection: 'publikace',
      depth: 2,
      limit: 1,
      pagination: false,
      ...(await draftFindOptions()),
      where: {
        and: [listingWhere, { slug: { equals: slug } }],
      },
    }),
    payload.find({
      collection: 'publikace',
      depth: 0,
      limit: 100,
      pagination: false,
      sort: 'title',
      where: listingWhere,
    }),
  ])

  const doc = result.docs[0]
  if (!doc) notFound()

  const listingHref = '/publikace'
  const menuMatch = menuParentForHref(site.mainMenu, listingHref)
  const pubSiblings = siblings.docs.map((item) => ({
    href: withSiteQuery(`/publikace/${item.slug}`, site.slug),
    label: item.title,
  }))

  const breadcrumbs = menuMatch
    ? [
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        {
          href: withSiteQuery(menuMatch.parent.href, site.slug),
          label: menuMatch.parent.label,
        },
        { href: withSiteQuery(listingHref, site.slug), label: 'Publikace' },
        {
          href: withSiteQuery(`/publikace/${doc.slug}`, site.slug),
          label: doc.title,
          siblings: pubSiblings,
        },
      ]
    : [
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: withSiteQuery(listingHref, site.slug), label: 'Publikace' },
        {
          href: withSiteQuery(`/publikace/${doc.slug}`, site.slug),
          label: doc.title,
          siblings: pubSiblings,
        },
      ]

  return (
    <SiteShell
      beforeMain={<PublicationHeader item={doc} />}
      breadcrumbs={breadcrumbs}
      mainClassName="pt-content-top"
      site={site}
      stacked={false}
    >
      <PublicationBody item={doc} />
    </SiteShell>
  )
}

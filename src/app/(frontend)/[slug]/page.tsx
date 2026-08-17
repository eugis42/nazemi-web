import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { PageBlocks } from '@/components/frontend/BlockRenderers'
import { PageIntro } from '@/components/frontend/cards'
import { SiteShell } from '@/components/frontend/SiteShell'
import { mediaFocalStyle, mediaSizeURL, menuParentForHref, withSiteQuery } from '@/lib/content'
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
    collection: 'stranky',
    depth: 1,
    limit: 1,
    pagination: false,
    ...(await draftFindOptions()),
    where: {
      and: [
        await getListingWhere({ collection: 'stranky', siteId: site.id }),
        { slug: { equals: slug } },
        { isHomepage: { not_equals: true } },
      ],
    },
  })
  return buildPageMetadata({
    doc: result.docs[0] || { title: slug },
    path: `/${slug}`,
    site,
  })
}

export default async function SitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ site?: string }>
}) {
  const { slug } = await params
  const { site: querySiteSlug } = await searchParams
  const site = await resolveSiteFromCurrentRequest(querySiteSlug)
  const payload = await getPayloadClient()
  const listingWhere = await getListingWhere({
    collection: 'stranky',
    siteId: site.id,
  })
  const draftOpts = await draftFindOptions()

  const page = await payload.find({
    collection: 'stranky',
    depth: 2,
    limit: 1,
    pagination: false,
    ...draftOpts,
    where: {
      and: [
        listingWhere,
        {
          slug: {
            equals: slug,
          },
        },
        {
          isHomepage: {
            not_equals: true,
          },
        },
      ],
    },
  })

  const doc = page.docs[0]

  if (!doc) {
    // Homepage slug (e.g. /home) → soft-land on `/` instead of 404.
    const homepage = await payload.find({
      collection: 'stranky',
      depth: 0,
      limit: 1,
      pagination: false,
      ...draftOpts,
      where: {
        and: [
          listingWhere,
          {
            slug: {
              equals: slug,
            },
          },
          {
            isHomepage: {
              equals: true,
            },
          },
        ],
      },
    })

    if (homepage.docs[0]) {
      redirect(withSiteQuery('/', site.slug))
    }

    notFound()
  }

  const cover = doc.coverImage && typeof doc.coverImage === 'object' ? doc.coverImage : null
  const pageHref = `/${doc.slug}`
  const menuMatch = menuParentForHref(site.mainMenu, pageHref)

  const breadcrumbs = menuMatch
    ? [
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        {
          href: withSiteQuery(menuMatch.parent.href, site.slug),
          label: menuMatch.parent.label,
        },
        {
          href: withSiteQuery(pageHref, site.slug),
          label: doc.title,
          siblings: menuMatch.siblings.map((sibling) => ({
            href: withSiteQuery(sibling.href, site.slug),
            label: sibling.label,
          })),
        },
      ]
    : [
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: withSiteQuery(pageHref, site.slug), label: doc.title },
      ]

  return (
    <SiteShell
      beforeMain={
        <PageIntro
          color={doc.headerColor}
          coverAlt={cover?.alt || doc.title}
          coverStyle={mediaFocalStyle(cover)}
          coverUrl={cover ? mediaSizeURL(cover, 'hero') : null}
          description={doc.excerpt}
          title={doc.title}
        />
      }
      breadcrumbs={breadcrumbs}
      mainClassName="pt-content-top"
      site={site}
      stacked={false}
    >
      <PageBlocks blocks={doc.content as never} skipPageIntro />
    </SiteShell>
  )
}

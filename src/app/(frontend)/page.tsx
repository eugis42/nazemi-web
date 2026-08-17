import React from 'react'
import type { Metadata } from 'next'

import { HomepageBlocks } from '@/components/frontend/HomepageBlocks'
import { SiteShell } from '@/components/frontend/SiteShell'
import {
  draftFindOptions,
  getListingWhere,
  getPayloadClient,
  resolveSiteFromCurrentRequest,
} from '@/lib/frontend'
import { buildPageMetadata } from '@/lib/metadata'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>
}): Promise<Metadata> {
  const { site: querySiteSlug } = await searchParams
  const site = await resolveSiteFromCurrentRequest(querySiteSlug)
  const payload = await getPayloadClient()
  const pages = await payload.find({
    collection: 'stranky',
    depth: 1,
    limit: 1,
    pagination: false,
    ...(await draftFindOptions()),
    where: {
      and: [
        await getListingWhere({ collection: 'stranky', siteId: site.id }),
        { isHomepage: { equals: true } },
      ],
    },
  })
  const homepage = pages.docs[0]
  return buildPageMetadata({
    doc: homepage
      ? {
          coverImage: homepage.coverImage,
          description: homepage.description,
          excerpt: homepage.excerpt,
          metaTitle: homepage.metaTitle,
          noindex: homepage.noindex,
          sharingImage: homepage.sharingImage,
          title: homepage.metaTitle || site.metaTitle || site.name,
        }
      : { title: site.metaTitle || site.name },
    path: '/',
    site,
  })
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>
}) {
  const { site: querySiteSlug } = await searchParams
  const site = await resolveSiteFromCurrentRequest(querySiteSlug)
  const payload = await getPayloadClient()

  const pages = await payload.find({
    collection: 'stranky',
    depth: 2,
    limit: 1,
    pagination: false,
    ...(await draftFindOptions()),
    where: {
      and: [
        await getListingWhere({
          collection: 'stranky',
          siteId: site.id,
        }),
        {
          isHomepage: {
            equals: true,
          },
        },
      ],
    },
  })

  const homepage = pages.docs[0]

  return (
    <SiteShell backdrop site={site} stacked={false}>
      {homepage ? (
        <HomepageBlocks blocks={homepage.homepageContent as never} site={site} />
      ) : (
        <div className="container py-16">
          <p className="font-saans text-card-title">
            Pro tento web zatím není nastavena domovská stránka (zaškrtněte „Domovská stránka“ u
            Stránky).
          </p>
        </div>
      )}
    </SiteShell>
  )
}

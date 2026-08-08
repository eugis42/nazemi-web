import type { Metadata } from 'next'

import { ProjectHeader } from '@/components/frontend/cards'
import { SiteShell } from '@/components/frontend/SiteShell'
import { withSiteQuery } from '@/lib/content'
import { assertCollectionEnabled } from '@/lib/enabled-collections'
import { getListingWhere, getPayloadClient, resolveSiteFromCurrentRequest } from '@/lib/frontend'
import { buildPageMetadata } from '@/lib/metadata'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>
}): Promise<Metadata> {
  const query = await searchParams
  const site = await resolveSiteFromCurrentRequest(query.site)
  return buildPageMetadata({ doc: { title: 'Projekty' }, path: '/projekty', site })
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>
}) {
  const { site: querySiteSlug } = await searchParams
  const site = await resolveSiteFromCurrentRequest(querySiteSlug)
  assertCollectionEnabled(site, 'projekty')
  const payload = await getPayloadClient()
  const projects = await payload.find({
    collection: 'projekty',
    depth: 2,
    limit: 20,
    sort: 'title',
    where: await getListingWhere({
      collection: 'projekty',
      siteId: site.id,
    }),
  })

  return (
    <SiteShell
      breadcrumbs={[
        { href: withSiteQuery('/', site.slug), label: 'Domů' },
        { href: withSiteQuery('/projekty', site.slug), label: 'Projekty' },
      ]}
      site={site}
      stacked={false}
    >
      <div data-block="projects">
        {projects.docs.map((item, index) => (
          <ProjectHeader
            headingLevel="h2"
            item={item}
            key={item.id}
            siteSlug={site.slug}
            spacing={index === 0 ? 'stacked-first' : 'stacked'}
          />
        ))}
      </div>
    </SiteShell>
  )
}

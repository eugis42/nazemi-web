import { cookies } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'

import { HideProjektyNavForSubsite } from './HideProjektyNavForSubsite'
import { SiteContextSelector } from './SiteContextSelector'
import { SiteNavGroupSiteLabelSync } from './SiteNavGroupSiteLabelSync'
import { ADMIN_SITE_COOKIE, MAIN_SITE_SLUG } from '@/lib/site-context'

export async function SiteContextNav() {
  const cookieStore = await cookies()
  const activeSiteSlug = cookieStore.get(ADMIN_SITE_COOKIE)?.value || MAIN_SITE_SLUG
  const payload = await getPayload({ config })

  // Prefer latest drafts, but always fall back to main-table rows.
  // Sites published via raw SQL may lack `_sites_v` → draft:true alone hides them.
  const [draftSites, publishedSites] = await Promise.all([
    payload.find({
      collection: 'sites',
      depth: 0,
      draft: true,
      limit: 50,
      overrideAccess: true,
      pagination: false,
      sort: ['siteType', 'name'],
    }),
    payload.find({
      collection: 'sites',
      depth: 0,
      limit: 50,
      overrideAccess: true,
      pagination: false,
      sort: ['siteType', 'name'],
    }),
  ])

  const byId = new Map<number | string, { id: number | string; name: string; slug: string }>()
  for (const site of [...publishedSites.docs, ...draftSites.docs]) {
    byId.set(site.id, {
      id: site.id,
      name: site.name,
      slug: site.slug,
    })
  }

  const siteList = [...byId.values()].sort((a, b) => {
    const aMain = a.slug === MAIN_SITE_SLUG ? 0 : 1
    const bMain = b.slug === MAIN_SITE_SLUG ? 0 : 1
    if (aMain !== bMain) return aMain - bMain
    return a.name.localeCompare(b.name, 'cs')
  })

  const activeSiteName =
    siteList.find((s) => s.slug === activeSiteSlug)?.name?.trim() || activeSiteSlug

  return (
    <div
      style={{
        marginBottom: 'calc(var(--base) * 0.5)',
      }}
    >
      <HideProjektyNavForSubsite />
      <SiteNavGroupSiteLabelSync siteName={activeSiteName} />
      <SiteContextSelector
        activeSiteSlug={activeSiteSlug}
        sites={siteList}
      />
    </div>
  )
}

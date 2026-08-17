import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@payload-config'

import { ADMIN_SITE_COOKIE, MAIN_SITE_SLUG } from '@/lib/site-context'
import {
  SITE_SETTINGS_QUERY,
  type SiteSettingsTabKey,
} from '@/lib/site-settings-nav'

async function redirectToActiveSiteSettings(tabKey: SiteSettingsTabKey): Promise<never> {
  const cookieStore = await cookies()
  const activeSiteSlug = cookieStore.get(ADMIN_SITE_COOKIE)?.value || MAIN_SITE_SLUG
  const payload = await getPayload({ config })

  const [draftSites, publishedSites] = await Promise.all([
    payload.find({
      collection: 'sites',
      depth: 0,
      draft: true,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: { slug: { equals: activeSiteSlug } },
    }),
    payload.find({
      collection: 'sites',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: { slug: { equals: activeSiteSlug } },
    }),
  ])

  const site = draftSites.docs[0] ?? publishedSites.docs[0]
  if (!site) {
    redirect('/admin/collections/sites')
  }

  redirect(
    `/admin/collections/sites/${site.id}?${SITE_SETTINGS_QUERY}=${tabKey}`,
  )
}

export async function RedirectToSiteSettings_navigace() {
  await redirectToActiveSiteSettings('navigace')
}

export async function RedirectToSiteSettings_kontakt() {
  await redirectToActiveSiteSettings('kontakt')
}

export async function RedirectToSiteSettings_paticka() {
  await redirectToActiveSiteSettings('paticka')
}

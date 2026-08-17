import type { CollectionConfig } from 'payload'

import { siteSettingsNavAccess } from '@/access/roles'
import { ADMIN_NAV_SITE_SETTINGS } from '@/lib/admin-nav-groups'
import type { SiteSettingsTabKey } from '@/lib/site-settings-nav'

/**
 * Nav-only collections: put Navigace / Kontakt / Patička in sidebar group
 * "Nastavení webu" (Payload `admin.group` order). List view redirects to
 * active site edit with `?siteSettings=…` — data stays on `sites`.
 */
const buildSiteSettingsNavCollection = ({
  label,
  slug,
  tabKey,
}: {
  label: string
  slug: string
  tabKey: SiteSettingsTabKey
}): CollectionConfig => ({
  slug,
  access: siteSettingsNavAccess,
  admin: {
    group: ADMIN_NAV_SITE_SETTINGS,
    hideAPIURL: true,
    useAsTitle: 'title',
    components: {
      views: {
        list: {
          Component: `/components/admin/RedirectToSiteSettings#RedirectToSiteSettings_${tabKey}`,
        },
      },
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
      defaultValue: label,
    },
  ],
  labels: {
    plural: label,
    singular: label,
  },
  timestamps: false,
})

export const SiteNavigace = buildSiteSettingsNavCollection({
  label: 'Navigace',
  slug: 'site-navigace',
  tabKey: 'navigace',
})

export const SiteKontakt = buildSiteSettingsNavCollection({
  label: 'Kontakt',
  slug: 'site-kontakt',
  tabKey: 'kontakt',
})

export const SitePaticka = buildSiteSettingsNavCollection({
  label: 'Patička',
  slug: 'site-paticka',
  tabKey: 'paticka',
})

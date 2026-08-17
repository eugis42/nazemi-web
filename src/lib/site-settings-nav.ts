/** Query param on Sites edit — focuses one settings tab (sidebar deep-link). */
export const SITE_SETTINGS_QUERY = 'siteSettings'

export const SITE_SETTINGS_TABS = {
  navigace: 'Navigace',
  kontakt: 'Kontakt',
  paticka: 'Patička',
} as const

export type SiteSettingsTabKey = keyof typeof SITE_SETTINGS_TABS

export const SITE_SETTINGS_TAB_LABELS = Object.values(SITE_SETTINGS_TABS)

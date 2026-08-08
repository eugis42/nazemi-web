import { notFound } from 'next/navigation'

import type { Site } from '@/payload-types'
import { resolveMenuItem } from '@/lib/menu'

export type EnabledCollectionKey = keyof NonNullable<Site['enabledCollections']>

const HREF_TO_COLLECTION: { prefix: string; key: EnabledCollectionKey }[] = [
  { prefix: '/aktuality', key: 'aktuality' },
  { prefix: '/kalendar', key: 'kalendar' },
  { prefix: '/projekty', key: 'projekty' },
  { prefix: '/workshopy', key: 'workshopy' },
  { prefix: '/publikace', key: 'publikace' },
  { prefix: '/kontakt', key: 'lide' },
]

export function collectionKeyForHref(href?: string | null): EnabledCollectionKey | null {
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) {
    return null
  }
  const path = href.split('?')[0].replace(/\/$/, '') || '/'
  for (const entry of HREF_TO_COLLECTION) {
    if (path === entry.prefix || path.startsWith(`${entry.prefix}/`)) {
      return entry.key
    }
  }
  return null
}

export function isCollectionEnabled(site: Site, key: EnabledCollectionKey) {
  const flags = site.enabledCollections
  if (!flags) return true
  const value = flags[key]
  return value !== false
}

export function assertCollectionEnabled(site: Site, key: EnabledCollectionKey) {
  if (!isCollectionEnabled(site, key)) notFound()
}

type MenuItem = NonNullable<Site['mainMenu']>[number]

export function filterMenuByEnabledCollections(
  items: MenuItem[] | null | undefined,
  site: Site,
): MenuItem[] {
  if (!items?.length) return []

  return items
    .map((item) => {
      const resolved = resolveMenuItem(item)
      const key = collectionKeyForHref(resolved?.href)
      if (key && !isCollectionEnabled(site, key)) return null

      const children = (item.children || [])
        .map((child) => {
          const childResolved = resolveMenuItem(child)
          const childKey = collectionKeyForHref(childResolved?.href)
          if (childKey && !isCollectionEnabled(site, childKey)) return null
          return child
        })
        .filter(Boolean) as NonNullable<MenuItem['children']>

      return {
        ...item,
        children: children.length ? children : undefined,
      }
    })
    .filter(Boolean) as MenuItem[]
}

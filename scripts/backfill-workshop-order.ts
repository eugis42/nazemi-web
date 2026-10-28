/**
 * Seed Payload `_order` + `mainSiteOrder` for existing workshopy docs.
 * Usage: npx tsx scripts/backfill-workshop-order.ts
 */
import 'dotenv/config'

import { getPayload } from 'payload'
import { generateKeyBetween } from 'payload/shared'
import config from '@payload-config'

import { MAIN_SITE_SLUG } from '@/lib/site-context'

async function main() {
  const payload = await getPayload({ config })
  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
  })
  const slugById = new Map(
    sites.docs.map((site) => [String(site.id), site.slug as string]),
  )

  const all = await payload.find({
    collection: 'workshopy',
    depth: 0,
    limit: 500,
    overrideAccess: true,
    pagination: false,
    sort: 'title',
  })

  // Assign `_order` per owning site (title order as starting point).
  const bySite = new Map<string, typeof all.docs>()
  for (const doc of all.docs) {
    const siteId =
      typeof doc.site === 'object' && doc.site && 'id' in doc.site
        ? String((doc.site as { id: number | string }).id)
        : String(doc.site)
    const list = bySite.get(siteId) || []
    list.push(doc)
    bySite.set(siteId, list)
  }

  let key: string | null = null
  const siteOrder = new Map<number | string, string>()
  for (const [, docs] of bySite) {
    key = null
    for (const doc of docs) {
      key = generateKeyBetween(key, null)
      siteOrder.set(doc.id, key)
    }
  }

  // Main listing order: main-owned first (their site order), then cross-posts by title.
  const mainOwned = all.docs.filter((doc) => {
    const siteId =
      typeof doc.site === 'object' && doc.site && 'id' in doc.site
        ? String((doc.site as { id: number | string }).id)
        : String(doc.site)
    return slugById.get(siteId) === MAIN_SITE_SLUG
  })
  const crossPosts = all.docs.filter((doc) => {
    const siteId =
      typeof doc.site === 'object' && doc.site && 'id' in doc.site
        ? String((doc.site as { id: number | string }).id)
        : String(doc.site)
    return slugById.get(siteId) !== MAIN_SITE_SLUG && Boolean(doc.showOnMainSite)
  })

  key = null
  const mainOrder = new Map<number | string, string>()
  for (const doc of [...mainOwned, ...crossPosts]) {
    key = generateKeyBetween(key, null)
    mainOrder.set(doc.id, key)
  }

  for (const doc of all.docs) {
    const _order = siteOrder.get(doc.id)
    if (!_order) continue
    const siteId =
      typeof doc.site === 'object' && doc.site && 'id' in doc.site
        ? String((doc.site as { id: number | string }).id)
        : String(doc.site)
    const isMain = slugById.get(siteId) === MAIN_SITE_SLUG
    const mainSiteOrder =
      mainOrder.get(doc.id) || (isMain || doc.showOnMainSite ? _order : null)

    await payload.update({
      collection: 'workshopy',
      id: doc.id,
      context: { skipWorkshopOrderSync: true },
      data: {
        _order,
        ...(mainSiteOrder ? { mainSiteOrder } : {}),
      },
      draft: doc._status !== 'published',
      overrideAccess: true,
    })
  }

  console.log(`OK — ordered ${all.docs.length} workshops`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

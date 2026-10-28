import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

import { MAIN_SITE_SLUG, getAdminSiteSlugFromRequest } from '@/lib/site-context'

type AnyData = Record<string, unknown>

function siteIdOf(site: unknown): number | string | null {
  if (site == null || site === '') return null
  if (typeof site === 'number' || typeof site === 'string') return site
  if (typeof site === 'object' && site !== null && 'id' in site) {
    return (site as { id: number | string }).id
  }
  return null
}

async function resolveOwningSiteSlug(
  siteRef: unknown,
  req: Parameters<CollectionBeforeChangeHook>[0]['req'],
): Promise<string | null> {
  if (siteRef && typeof siteRef === 'object' && 'slug' in siteRef) {
    const slug = (siteRef as { slug?: string }).slug
    return typeof slug === 'string' ? slug : null
  }
  const id = siteIdOf(siteRef)
  if (id == null) return null
  try {
    const site = await req.payload.findByID({
      collection: 'sites',
      depth: 0,
      id,
      overrideAccess: true,
    })
    return typeof site.slug === 'string' ? site.slug : null
  } catch {
    return null
  }
}

/**
 * Dual order for workshopy:
 * - `_order` (Payload orderable) = order within the owning site
 * - `mainSiteOrder` = order on the main-site mixed listing (own + cross-posts)
 *
 * When editors DnD on the main admin list, Payload writes `_order`. For sub-site
 * docs we divert that write into `mainSiteOrder` and restore `_order` so the
 * sub-site listing order stays put.
 */
export const workshopOrderBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const next = { ...(data || {}) } as AnyData
  const adminSlug = getAdminSiteSlugFromRequest(req)
  const owningSlug = await resolveOwningSiteSlug(next.site ?? originalDoc?.site, req)
  const isSubsiteOwned = Boolean(owningSlug && owningSlug !== MAIN_SITE_SLUG)

  const prevOrder = typeof originalDoc?._order === 'string' ? originalDoc._order : null
  const nextOrder = typeof next._order === 'string' ? next._order : null
  const orderChanged = Boolean(nextOrder && nextOrder !== prevOrder)

  if (adminSlug === MAIN_SITE_SLUG && orderChanged && nextOrder) {
    if (isSubsiteOwned) {
      next.mainSiteOrder = nextOrder
      if (prevOrder) next._order = prevOrder
      else delete next._order
    } else {
      // Main-owned: keep native `_order` and mirror into main listing order.
      next.mainSiteOrder = nextOrder
    }
  }

  // Enabling cross-post → seed mainSiteOrder from current site order once.
  const turningOnCrossPost =
    next.showOnMainSite === true && originalDoc?.showOnMainSite !== true
  const mainOrderEmpty =
    typeof next.mainSiteOrder !== 'string' || !next.mainSiteOrder
  const originalMainEmpty =
    typeof originalDoc?.mainSiteOrder !== 'string' || !originalDoc.mainSiteOrder
  if (turningOnCrossPost && mainOrderEmpty && originalMainEmpty) {
    const seed =
      (typeof next._order === 'string' && next._order) ||
      (typeof originalDoc?._order === 'string' && originalDoc._order) ||
      null
    if (seed) next.mainSiteOrder = seed
  }

  return next
}

/**
 * After Payload’s orderable hook assigns `_order` on create, seed `mainSiteOrder`
 * for main-owned docs (and cross-posts still missing a main key).
 */
export const workshopOrderAfterChange: CollectionAfterChangeHook = async ({
  context,
  doc,
  req,
}) => {
  if (context?.skipWorkshopOrderSync) return doc

  const order = typeof doc._order === 'string' ? doc._order : null
  if (!order) return doc

  const owningSlug = await resolveOwningSiteSlug(doc.site, req)
  const isMainOwned = !owningSlug || owningSlug === MAIN_SITE_SLUG
  const onMainListing = isMainOwned || Boolean(doc.showOnMainSite)
  if (!onMainListing) return doc

  const mainOrder = typeof doc.mainSiteOrder === 'string' ? doc.mainSiteOrder : null
  if (isMainOwned) {
    if (mainOrder === order) return doc
  } else if (mainOrder) {
    return doc
  }

  await req.payload.update({
    collection: 'workshopy',
    id: doc.id,
    context: { skipWorkshopOrderSync: true },
    data: { mainSiteOrder: order },
    overrideAccess: true,
  })

  return doc
}

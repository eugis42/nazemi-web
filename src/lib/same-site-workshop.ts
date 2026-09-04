import type { PayloadRequest, Validate, Where } from 'payload'

import { relationId } from '@/search/flatten'

export const workshopCrossSiteError =
  'Workshop musí patřit ke stejnému webu jako tato událost.'

export const kalendarSiteSwitchError =
  'Nelze změnit web: událost je propojená s workshopem z jiného webu. Nejdřív odpojte workshop.'

export const workshopSiteSwitchError =
  'Nelze změnit web: existují kalendářové události na jiném webu propojené s tímto workshopem. Nejdřív je odpojte nebo přesuňte.'

function sameId(a: unknown, b: unknown): boolean {
  const left = relationId(a)
  const right = relationId(b)
  if (left == null || right == null) return false
  return String(left) === String(right)
}

/** Relationship picker: only workshops on the event’s web. */
export function kalendarWorkshopFilterOptions({
  data,
}: {
  data?: Record<string, unknown> | null
}): Where | false {
  const siteId = relationId(data?.site)
  if (siteId == null) return false
  return { site: { equals: siteId } }
}

export const validateKalendarWorkshopSameSite: Validate = async (value, { data, req }) => {
  if (value == null || value === '') return true
  const eventSiteId = relationId((data as { site?: unknown } | undefined)?.site)
  const workshopId = relationId(value)
  if (eventSiteId == null || workshopId == null) return true

  const workshop = await req.payload.findByID({
    collection: 'workshopy',
    depth: 0,
    id: workshopId,
    overrideAccess: true,
    req: req as PayloadRequest,
  })
  if (!sameId(workshop?.site, eventSiteId)) return workshopCrossSiteError
  return true
}

/** Block changing event web while a foreign-site workshop stays linked. */
export const validateKalendarSiteAgainstWorkshop: Validate = async (value, { data, req }) => {
  if (value == null || value === '') return true
  const workshopId = relationId((data as { workshop?: unknown } | undefined)?.workshop)
  if (workshopId == null) return true

  const workshop = await req.payload.findByID({
    collection: 'workshopy',
    depth: 0,
    id: workshopId,
    overrideAccess: true,
    req: req as PayloadRequest,
  })
  if (!sameId(workshop?.site, value)) return kalendarSiteSwitchError
  return true
}

/** Block changing workshop web while events on another web still point at it. */
export const validateWorkshopSiteAgainstKalendar: Validate = async (value, { id, req }) => {
  if (value == null || value === '' || id == null) return true
  const siteId = relationId(value)
  if (siteId == null) return true

  const linked = await req.payload.find({
    collection: 'kalendar',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req: req as PayloadRequest,
    where: {
      and: [{ workshop: { equals: id } }, { site: { not_equals: siteId } }],
    },
  })
  if (linked.docs.length > 0) return workshopSiteSwitchError
  return true
}

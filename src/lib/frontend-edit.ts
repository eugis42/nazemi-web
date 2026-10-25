import { headers } from 'next/headers'

import { userRole } from '@/access/roles'
import { getPayloadClient } from '@/lib/frontend'

/** Collections with FE detail views editors can jump into from the site. */
export type FrontendEditableCollection =
  | 'stranky'
  | 'aktuality'
  | 'kalendar'
  | 'workshopy'
  | 'publikace'
  | 'projekty'

/**
 * Admin edit URL for the current doc, or null if visitor cannot update.
 * Uses Payload `auth({ headers })` (same cookie session as /admin).
 */
export async function resolveAdminEditHref(
  collection: FrontendEditableCollection,
  id: number | string | null | undefined,
): Promise<string | null> {
  if (id == null || id === '') return null

  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  // Content collections: update = editorOrAdmin (role admin|editor).
  if (!userRole(user)) return null

  return `/admin/collections/${collection}/${id}`
}

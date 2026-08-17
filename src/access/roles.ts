import type { Access, AccessArgs } from 'payload'

import type { User } from '@/payload-types'

export type UserRole = 'admin' | 'editor'

type UserWithRole = User & { role?: UserRole | null }

const getUser = (args: AccessArgs): UserWithRole | null =>
  (args.req.user as UserWithRole | null | undefined) ?? null

export const userRole = (user: unknown): UserRole | null => {
  if (!user || typeof user !== 'object') return null
  const role = (user as { role?: unknown }).role
  return role === 'admin' || role === 'editor' ? role : null
}

export const isAdmin = (user: unknown) => userRole(user) === 'admin'

export const isLoggedIn = (user: UserWithRole | null | undefined) => Boolean(user)

/** Auth collection `access.admin` — who may open the admin UI (boolean only). */
export const canAccessAdminBoolean = ({ req }: { req: AccessArgs['req'] }) =>
  userRole(req.user) !== null

/** Authenticated users can read admin collections. */
export const authenticated: Access = ({ req }) => Boolean(req.user)

/** Admin or editor can create/update/delete content + taxonomies + media. */
export const editorOrAdmin: Access = ({ req }) => userRole(req.user) !== null

/** Administrace + Nastavení webu (sites, users, search, nav/contact/footer). */
export const adminOnly: Access = ({ req }) => isAdmin(getUser({ req } as AccessArgs))

/** `access.admin` must return boolean (not a Where query). */
export const adminOnlyBoolean = ({ req }: { req: AccessArgs['req'] }) => isAdmin(req.user)

export const adminOnlyOrSelf: Access = ({ req, id }) => {
  const user = getUser({ req } as AccessArgs)
  if (!user) return false
  if (isAdmin(user)) return true
  // Editors: own record only. No `id` (Access Operation) → hide Users from nav.
  if (id && String(id) === String(user.id)) return true
  return false
}

export const contentCollectionAccess = {
  create: editorOrAdmin,
  delete: editorOrAdmin,
  read: authenticated,
  update: editorOrAdmin,
}

/** Weby: editors may read (site picker on content); no admin nav / mutations. */
export const sitesAccess = {
  admin: adminOnlyBoolean,
  create: adminOnly,
  delete: adminOnly,
  read: authenticated,
  readVersions: adminOnly,
  update: adminOnly,
}

/** Nav-only shells (Navigace / Kontakt / Patička) — admin only. */
export const siteSettingsNavAccess = {
  admin: adminOnlyBoolean,
  create: () => false,
  delete: () => false,
  read: adminOnly,
  update: () => false,
}

/** Users collection: panel login for both roles; CRUD admin-only except own profile. */
export const usersAccess = {
  admin: canAccessAdminBoolean,
  create: adminOnly,
  delete: adminOnly,
  read: adminOnlyOrSelf,
  unlock: adminOnly,
  update: adminOnlyOrSelf,
}

export const mediaAccess = {
  create: editorOrAdmin,
  delete: editorOrAdmin,
  read: () => true,
  update: editorOrAdmin,
}

export const searchIndexAccess = {
  create: adminOnly,
  delete: adminOnly,
  read: adminOnly,
  update: adminOnly,
}

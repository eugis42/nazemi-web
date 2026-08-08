import type { Access, AccessArgs } from 'payload'

import type { User } from '@/payload-types'

type UserWithRole = User & { role?: 'admin' | 'editor' | null }

const getUser = (args: AccessArgs): UserWithRole | null =>
  (args.req.user as UserWithRole | null | undefined) ?? null

export const isAdmin = (user: UserWithRole | null | undefined) => user?.role === 'admin'

export const isLoggedIn = (user: UserWithRole | null | undefined) => Boolean(user)

/** Authenticated users can read admin collections. */
export const authenticated: Access = ({ req }) => Boolean(req.user)

/** Admin or editor can create/update/delete content + taxonomies + media. */
export const editorOrAdmin: Access = ({ req }) => {
  const user = getUser({ req } as AccessArgs)
  return isAdmin(user) || user?.role === 'editor'
}

/** Sites and Users: admin only for mutations; authenticated read in admin. */
export const adminOnly: Access = ({ req }) => isAdmin(getUser({ req } as AccessArgs))

/** `access.admin` must return boolean (not a Where query). */
export const adminOnlyBoolean = ({ req }: { req: AccessArgs['req'] }) =>
  isAdmin(getUser({ req } as AccessArgs))

export const adminOnlyOrSelf: Access = ({ req, id }) => {
  const user = getUser({ req } as AccessArgs)
  if (!user) return false
  if (isAdmin(user)) return true
  // Editors can read/update own user record (profile), not list/create others.
  if (id && String(id) === String(user.id)) return true
  return false
}

export const contentCollectionAccess = {
  create: editorOrAdmin,
  delete: editorOrAdmin,
  read: authenticated,
  update: editorOrAdmin,
}

export const adminSettingsAccess = {
  admin: adminOnlyBoolean,
  create: adminOnly,
  delete: adminOnly,
  read: authenticated,
  update: adminOnly,
}

export const usersAccess = {
  admin: adminOnlyBoolean,
  create: adminOnly,
  delete: adminOnly,
  read: adminOnlyOrSelf,
  update: adminOnlyOrSelf,
}

export const mediaAccess = {
  create: editorOrAdmin,
  delete: editorOrAdmin,
  read: () => true,
  update: editorOrAdmin,
}

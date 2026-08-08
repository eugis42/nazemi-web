import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, FieldHook } from 'payload'

import { MAIN_SITE_SLUG, getAdminSiteSlugFromRequest } from '@/lib/site-context'
import { slugify } from '@/lib/slug'

type AnyData = Record<string, unknown>

const descriptionWasCustomised = (data: AnyData, originalDoc?: AnyData | null) => {
  if (typeof data.description === 'string' && data.description.trim().length > 0) {
    return true
  }

  if (originalDoc && typeof originalDoc.description === 'string' && originalDoc.description.trim().length > 0) {
    return true
  }

  return false
}

export const populateSlugAndDescription: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const nextData = { ...(data || {}) } as AnyData

  if (!nextData.slug && typeof nextData.title === 'string' && nextData.title) {
    nextData.slug = slugify(nextData.title)
  }

  if (!descriptionWasCustomised(nextData, originalDoc) && typeof nextData.excerpt === 'string') {
    nextData.description = nextData.excerpt
  }

  if (!nextData.site) {
    const activeSiteSlug = getAdminSiteSlugFromRequest(req)
    const siteResult = await req.payload.find({
      collection: 'sites',
      depth: 0,
      limit: 1,
      pagination: false,
      where: {
        slug: {
          equals: activeSiteSlug,
        },
      },
    })

    if (siteResult.docs[0]?.id) {
      nextData.site = siteResult.docs[0].id
    }
  }

  if (!nextData.author && req.user) {
    nextData.author = req.user.id
  }

  // Public byline: prefill from internal editor when empty (Aktuality / similar).
  const authorNameEmpty =
    typeof nextData.authorName !== 'string' || !nextData.authorName.trim()
  if (authorNameEmpty && nextData.author) {
    const authorId =
      typeof nextData.author === 'object' && nextData.author !== null && 'id' in nextData.author
        ? (nextData.author as { id: number | string }).id
        : nextData.author

    if (req.user && String(req.user.id) === String(authorId)) {
      const userName =
        typeof (req.user as { name?: string }).name === 'string'
          ? (req.user as { name?: string }).name
          : null
      nextData.authorName = userName || req.user.email || ''
    } else if (authorId) {
      try {
        const user = await req.payload.findByID({
          collection: 'users',
          depth: 0,
          id: authorId as number | string,
          overrideAccess: true,
        })
        nextData.authorName = user?.name || user?.email || ''
      } catch {
        // Author may be missing during seed races — leave empty.
      }
    }
  }

  return nextData
}

export const makeSlugUniqueOnDuplicate = async ({ data }: { data: Partial<AnyData> }) => {
  if (typeof data.slug === 'string') {
    return {
      ...data,
      slug: `${data.slug}-kopie`,
      title: typeof data.title === 'string' ? `${data.title} (kopie)` : data.title,
    }
  }

  return data
}

export const lockProjectsToMainSite: CollectionBeforeChangeHook = async ({ data, req }) => {
  const nextData = { ...(data || {}) } as AnyData

  if (!nextData.site) {
    const mainSite = await req.payload.find({
      collection: 'sites',
      depth: 0,
      limit: 1,
      pagination: false,
      where: {
        slug: {
          equals: MAIN_SITE_SLUG,
        },
      },
    })

    if (mainSite.docs[0]?.id) {
      nextData.site = mainSite.docs[0].id
    }
  }

  return nextData
}

export const revalidateFrontend: CollectionAfterChangeHook = async () => {
  // Reserved for cache revalidation or job queue when configured.
}

export const normaliseSiteSlug: FieldHook = ({ value, siblingData }) => {
  if (typeof value === 'string' && value.trim()) {
    return slugify(value)
  }

  if (typeof siblingData?.name === 'string') {
    return slugify(siblingData.name)
  }

  return value
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Where } from 'payload'

import { mediaAlt, mediaSizeURL } from '@/lib/content'
import { getPayloadClient } from '@/lib/frontend'
import { MAIN_SITE_SLUG } from '@/lib/site-context'

type WorkshopDoc = {
  coverAlt: string
  coverUrl: string | null
  id: string | number
  tags: string[]
  title: string
}

function tagTitles(items: unknown): string[] {
  if (!Array.isArray(items)) return []
  const out: string[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const title = (item as { title?: unknown }).title
    if (typeof title === 'string' && title.trim()) out.push(title.trim())
  }
  return out
}

/** Public list of published workshops for form multi-select (cover + tags). */
export async function GET(request: NextRequest) {
  const siteSlug = (request.nextUrl.searchParams.get('site') || MAIN_SITE_SLUG).trim()
  const payload = await getPayloadClient()

  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: siteSlug } },
  })
  const site = sites.docs[0]
  if (!site) {
    return NextResponse.json({ docs: [] as WorkshopDoc[], site: siteSlug })
  }

  const where: Where = {
    and: [
      { site: { equals: site.id } },
      { _status: { equals: 'published' } },
    ],
  }

  const result = await payload.find({
    collection: 'workshopy',
    depth: 1,
    limit: 200,
    overrideAccess: true,
    sort: 'title',
    where,
  })

  const docs: WorkshopDoc[] = []
  for (const doc of result.docs) {
    const title = typeof doc.title === 'string' ? doc.title.trim() : ''
    if (!title) continue
    const cover =
      doc.coverImage && typeof doc.coverImage === 'object' ? doc.coverImage : null
    docs.push({
      id: doc.id,
      title,
      coverUrl: cover ? mediaSizeURL(cover, 'landscape') : null,
      coverAlt: cover ? mediaAlt(cover, title) : title,
      tags: tagTitles(doc.audiences),
    })
  }

  return NextResponse.json({ docs, site: siteSlug })
}

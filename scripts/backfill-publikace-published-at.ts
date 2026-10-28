/**
 * Backfill Publikace.publishedAt from metodiky WXR `wp:post_date` (by slug).
 * Docs without a WXR match (or empty date) → today.
 *
 * Usage:
 *   npx tsx scripts/backfill-publikace-published-at.ts
 *   npx tsx scripts/backfill-publikace-published-at.ts --xml=/path/to.xml
 */
import 'dotenv/config'

import fs from 'node:fs'

import { getPayload } from 'payload'
import config from '@payload-config'

import { slugify } from '@/lib/slug'

import { parseMetodikyWxrFile } from './import-metodiky/parse-wxr'

const DEFAULT_XML =
  '/Users/eugenkorda/Library/Containers/com.apple.mail/Data/Library/Mail Downloads/C8A565A6-1B1B-4B12-A244-A50C32C87BDB/nazemi.WordPress.metodicke-materialy.xml'

const argValue = (args: string[], name: string) => {
  const hit = args.find((arg) => arg.startsWith(`${name}=`))
  return hit ? hit.slice(name.length + 1) : undefined
}

const toIso = (wpDate: string) => {
  if (!wpDate || wpDate.startsWith('1970')) return null
  const parsed = new Date(wpDate.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

async function main() {
  const args = process.argv.slice(2)
  const xmlPath = argValue(args, '--xml') || DEFAULT_XML
  const today = new Date().toISOString()

  const bySlug = new Map<string, string>()
  if (fs.existsSync(xmlPath)) {
    const dump = parseMetodikyWxrFile(xmlPath)
    for (const post of dump.posts) {
      const slug = (
        post.slug?.trim() ||
        `${slugify(post.title) || 'metodika'}-${post.id}`
      ).toLowerCase()
      const iso = toIso(post.date)
      if (iso) bySlug.set(slug, iso)
    }
    console.log(`WXR dates: ${bySlug.size} posts from ${xmlPath}`)
  } else {
    console.warn(`WXR missing (${xmlPath}) — all docs get today`)
  }

  const payload = await getPayload({ config })
  let page = 1
  let fromWxr = 0
  let fromToday = 0

  for (;;) {
    const batch = await payload.find({
      collection: 'publikace',
      depth: 0,
      limit: 100,
      page,
      overrideAccess: true,
      pagination: true,
    })
    if (!batch.docs.length) break

    for (const doc of batch.docs) {
      const slug = typeof doc.slug === 'string' ? doc.slug.toLowerCase() : ''
      const publishedAt = (slug && bySlug.get(slug)) || today
      if (publishedAt === today) fromToday += 1
      else fromWxr += 1

      await payload.update({
        collection: 'publikace',
        id: doc.id,
        data: { publishedAt },
        draft: doc._status !== 'published',
        overrideAccess: true,
      })
    }

    if (!batch.hasNextPage) break
    page += 1
  }

  console.log(`OK — from WXR: ${fromWxr}, today: ${fromToday}`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

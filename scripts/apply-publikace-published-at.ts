/**
 * Apply slug → publishedAt JSON onto current DATABASE_URL (staging/prod).
 *
 *   npx tsx scripts/apply-publikace-published-at.ts --file=/tmp/publikace-published-at.json
 */
import 'dotenv/config'

import fs from 'node:fs'

import { getPayload } from 'payload'
import config from '@payload-config'

const argValue = (args: string[], name: string) => {
  const hit = args.find((arg) => arg.startsWith(`${name}=`))
  return hit ? hit.slice(name.length + 1) : undefined
}

async function main() {
  const file = argValue(process.argv.slice(2), '--file')
  if (!file || !fs.existsSync(file)) {
    throw new Error('Usage: --file=/path/to/publikace-published-at.json')
  }

  const rows = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    slug: string
    publishedAt: string
  }[]
  const bySlug = new Map(rows.map((r) => [r.slug.toLowerCase(), r.publishedAt]))

  const payload = await getPayload({ config })
  let updated = 0
  let missing = 0
  let page = 1

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
      const publishedAt = slug ? bySlug.get(slug) : undefined
      if (!publishedAt) {
        missing += 1
        continue
      }
      if (doc.publishedAt === publishedAt) continue
      await payload.update({
        collection: 'publikace',
        id: doc.id,
        data: { publishedAt },
        draft: doc._status !== 'published',
        overrideAccess: true,
      })
      updated += 1
    }

    if (!batch.hasNextPage) break
    page += 1
  }

  console.log(`OK — updated ${updated}, no local date for ${missing} staging docs (of ${bySlug.size} local)`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Export Publikace slug → publishedAt JSON (local source of truth).
 *
 *   npx tsx scripts/export-publikace-published-at.ts > /tmp/publikace-published-at.json
 */
import 'dotenv/config'

import { getPayload } from 'payload'
import config from '@payload-config'

async function main() {
  const payload = await getPayload({ config })
  const rows: { slug: string; publishedAt: string }[] = []
  let page = 1

  for (;;) {
    const batch = await payload.find({
      collection: 'publikace',
      depth: 0,
      limit: 100,
      page,
      overrideAccess: true,
      pagination: true,
      select: { slug: true, publishedAt: true },
    })
    for (const doc of batch.docs) {
      const slug = typeof doc.slug === 'string' ? doc.slug : ''
      const publishedAt = typeof doc.publishedAt === 'string' ? doc.publishedAt : null
      if (slug && publishedAt) rows.push({ slug, publishedAt })
    }
    if (!batch.hasNextPage) break
    page += 1
  }

  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

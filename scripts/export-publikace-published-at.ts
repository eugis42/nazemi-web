/**
 * Export Publikace slug → publishedAt JSON (local source of truth).
 *
 *   npx tsx scripts/export-publikace-published-at.ts
 *   npx tsx scripts/export-publikace-published-at.ts --out=/tmp/publikace-published-at.json
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
  const out = argValue(process.argv.slice(2), '--out') || '/tmp/publikace-published-at.json'
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

  fs.writeFileSync(out, `${JSON.stringify(rows, null, 2)}\n`)
  console.error(`Wrote ${rows.length} rows → ${out}`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

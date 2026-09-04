/**
 * One-shot: replace additionalColors on all sites with the shared accent palette.
 * Usage: npx tsx scripts/update-site-colors.ts
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { DEFAULT_ADDITIONAL_COLORS } from '../src/lib/site-colors'

const payload = await getPayload({ config })

const sites = await payload.find({
  collection: 'sites',
  depth: 0,
  draft: true,
  limit: 100,
  overrideAccess: true,
  pagination: false,
})

for (const site of sites.docs) {
  await payload.update({
    collection: 'sites',
    id: site.id,
    data: {
      additionalColors: [...DEFAULT_ADDITIONAL_COLORS],
    },
    draft: site._status === 'draft',
    overrideAccess: true,
  })
  console.log(`Updated ${site.slug} (${site.id})`)
}

await payload.db.destroy?.()
console.log(`Done — ${sites.docs.length} site(s).`)
process.exit(0)

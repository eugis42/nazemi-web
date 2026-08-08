/**
 * Clear saved admin list-column preferences so defaultColumns take effect.
 * Usage: npx tsx scripts/clear-list-prefs.ts [collectionSlug]
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '@payload-config'

async function main() {
  const slug = process.argv[2] || 'aktuality'
  const payload = await getPayload({ config })

  const prefs = await payload.find({
    collection: 'payload-preferences',
    depth: 0,
    limit: 200,
    pagination: false,
  })

  const matching = prefs.docs.filter((doc) => {
    const key = typeof doc.key === 'string' ? doc.key : ''
    return (
      key.includes(slug) ||
      key.includes(`collection-${slug}`) ||
      key.includes(`collections-${slug}`)
    )
  })

  console.log(`Found ${matching.length} preference(s) matching "${slug}"`)
  for (const doc of matching) {
    console.log('-', doc.id, doc.key)
    await payload.delete({
      collection: 'payload-preferences',
      id: doc.id,
    })
  }

  // Also dump a few keys to help discover naming
  if (!matching.length) {
    console.log('Sample preference keys:')
    for (const doc of prefs.docs.slice(0, 30)) {
      console.log('-', doc.key)
    }
  }

  console.log('Done. Hard-refresh admin list.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

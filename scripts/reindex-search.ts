/**
 * Rebuild the plugin-search index from published source docs.
 * Usage: npx tsx scripts/reindex-search.ts
 */
import 'dotenv/config'

import { getPayload } from 'payload'
import type { PayloadRequest } from 'payload'

import config from '@payload-config'
import { searchBeforeSync } from '../src/search/beforeSync'
import { searchPriorityForDoc } from '../src/search/priorities'

const COLLECTIONS = [
  'stranky',
  'aktuality',
  'kalendar',
  'projekty',
  'workshopy',
  'publikace',
] as const

async function main() {
  const payload = await getPayload({ config })

  // Wipe existing index
  await payload.delete({
    collection: 'search',
    where: {
      id: {
        exists: true,
      },
    },
  })

  let total = 0

  for (const collection of COLLECTIONS) {
    const result = await payload.find({
      collection,
      depth: 1,
      draft: false,
      limit: 500,
      pagination: false,
      where: {
        or: [
          { _status: { equals: 'published' } },
          { _status: { exists: false } },
        ],
      },
    })

    for (const doc of result.docs) {
      if (doc._status === 'draft') continue

      const searchDoc = await searchBeforeSync({
        collectionSlug: collection,
        originalDoc: doc,
        payload,
        req: { payload } as PayloadRequest,
        searchDoc: {
          doc: {
            relationTo: collection,
            value: doc.id,
          },
          title: typeof doc.title === 'string' ? doc.title : '',
        },
      })

      await payload.create({
        collection: 'search',
        data: {
          ...searchDoc,
          priority: searchPriorityForDoc(collection, doc),
        },
        depth: 0,
      })
      total += 1
    }

    console.log(`${collection}: indexed ${result.docs.length}`)
  }

  console.log(`Done. Total search docs: ${total}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

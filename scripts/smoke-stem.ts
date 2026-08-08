import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { querySearchTerms } from '../src/lib/czech-stem'

async function main() {
  const payload = await getPayload({ config })
  for (const q of ['transformace', 'akademie', 'nerust']) {
    const terms = querySearchTerms(q)
    const result = await payload.find({
      collection: 'search',
      depth: 0,
      limit: 8,
      sort: 'priority',
      where: {
        and: terms.map((term) => ({ searchText: { contains: term } })),
      },
    })
    console.log('\nQ:', q, 'terms:', terms, 'total:', result.totalDocs)
    for (const doc of result.docs) {
      console.log(' -', doc.title, '|', doc.collectionSlug)
    }
  }
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

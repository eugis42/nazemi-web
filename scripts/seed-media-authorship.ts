/**
 * Set Media.authorship on every image (shared library = NaZemi + Flowmakers).
 * Usage: npx tsx scripts/seed-media-authorship.ts
 */
import 'dotenv/config'

import { getPayload } from 'payload'
import config from '@payload-config'

const CREDITS = [
  'Foto: EK',
  'Foto: Eugen Korda',
  'Foto: Marie Nováková',
  'Foto: Eugen Korda / NaZemi',
  'Foto: Archiv NaZemi, Brno 2024',
  'Foto: Eugen Korda — workshop Facilitace v týmu, Porta Coeli',
  'Ilustrace: Flowmakers',
  'Foto: Tomáš Černý',
  'Foto: Klára Horáková / NaNebi',
  'Foto: Archiv Flowmakers',
]

async function main() {
  const payload = await getPayload({ config })
  let page = 1
  let updated = 0
  let total = 0

  for (;;) {
    const batch = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 100,
      page,
      overrideAccess: true,
      where: { mimeType: { contains: 'image' } },
      sort: 'id',
    })
    total = batch.totalDocs
    if (!batch.docs.length) break

    for (const doc of batch.docs) {
      const authorship = CREDITS[updated % CREDITS.length]
      await payload.update({
        collection: 'media',
        id: doc.id,
        data: { authorship },
        overrideAccess: true,
      })
      updated += 1
      if (updated % 50 === 0) console.log(`… ${updated}/${total}`)
    }

    if (!batch.hasNextPage) break
    page += 1
  }

  console.log(`OK — authorship set on ${updated} / ${total} images`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

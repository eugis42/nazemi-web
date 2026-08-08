/**
 * Append sample Galerie blocks to /o-nazemi for FE testing.
 * Usage: npx tsx scripts/seed-o-nazemi-galleries.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

const SAMPLE_FILES = [
  'about-team.jpg',
  'news-1.jpg',
  'news-2.jpg',
  'news-3.jpg',
  'news-4.jpg',
  'event-1.jpg',
  'event-2.jpg',
  'event-3.jpg',
  'event-body.jpg',
] as const

async function main() {
  const payload = await getPayload({ config })

  const mediaByFile = new Map<string, number>()
  for (const filename of SAMPLE_FILES) {
    const found = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    if (found.docs[0]) mediaByFile.set(filename, found.docs[0].id)
  }

  const ids = [...mediaByFile.values()]
  if (ids.length < 5) {
    throw new Error(`Need ≥5 image media, found ${ids.length}: ${[...mediaByFile.keys()].join(', ')}`)
  }

  const pages = await payload.find({
    collection: 'stranky',
    where: { slug: { equals: 'o-nazemi' } },
    limit: 5,
    depth: 0,
  })

  if (!pages.docs.length) throw new Error('Page o-nazemi not found')

  const galleries = [
    {
      blockType: 'gallery' as const,
      images: [ids[0]],
      caption: 'Ukázka: 1 obrázek',
    },
    {
      blockType: 'gallery' as const,
      images: ids.slice(0, 2),
      columns: '2' as const,
      caption: 'Ukázka: 2 obrázky (2 sloupce)',
    },
    {
      blockType: 'gallery' as const,
      images: ids.slice(0, 3),
      columns: '3' as const,
      caption: 'Ukázka: 3 obrázky (3 sloupce)',
    },
    {
      blockType: 'gallery' as const,
      images: ids.slice(0, 5),
      columns: '2' as const,
      caption: 'Ukázka: 5 obrázků (2 sloupce)',
    },
  ]

  for (const page of pages.docs) {
    const existing = (page.content || []).filter(
      (b) => !(b.blockType === 'gallery' && typeof b.caption === 'string' && b.caption.startsWith('Ukázka:')),
    )

    await payload.update({
      collection: 'stranky',
      id: page.id,
      data: {
        content: [...existing, ...galleries],
        _status: 'published',
      },
      draft: false,
      overrideAccess: true,
    })

    console.log(`Updated o-nazemi id=${page.id} site=${page.site} — appended 4 galleries`)
  }

  await payload.db.destroy?.()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

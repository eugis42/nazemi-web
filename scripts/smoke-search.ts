/**
 * Smoke-test search index queries (site scope, type filter, past events).
 * Usage: npx tsx scripts/smoke-search.ts
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '@payload-config'

async function main() {
  const payload = await getPayload({ config })

  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 10,
    pagination: false,
  })
  const nazemi = sites.docs.find((s) => s.slug === 'nazemi')
  const brno = sites.docs.find((s) => s.slug === 'brno')
  if (!nazemi) throw new Error('nazemi site missing')

  const q = 'klima'
  const multi = await payload.find({
    collection: 'search',
    depth: 0,
    limit: 20,
    sort: 'priority',
    where: {
      and: [
        { site: { equals: nazemi.id } },
        {
          or: [{ title: { contains: q } }, { excerpt: { contains: q } }],
        },
      ],
    },
  })

  const byType = await payload.find({
    collection: 'search',
    depth: 0,
    limit: 20,
    where: {
      and: [
        { site: { equals: nazemi.id } },
        { collectionSlug: { equals: 'kalendar' } },
        {
          or: [{ title: { contains: q } }, { excerpt: { contains: q } }],
        },
      ],
    },
  })

  const past = await payload.find({
    collection: 'search',
    depth: 0,
    limit: 50,
    where: {
      and: [
        { site: { equals: nazemi.id } },
        { collectionSlug: { equals: 'kalendar' } },
        { eventIsPast: { equals: true } },
      ],
    },
  })

  const brnoCount = brno
    ? (
        await payload.find({
          collection: 'search',
          depth: 0,
          limit: 1,
          where: { site: { equals: brno.id } },
        })
      ).totalDocs
    : 0

  const types = new Set(multi.docs.map((d) => d.collectionSlug))
  console.log(
    JSON.stringify(
      {
        multiTotal: multi.totalDocs,
        multiTypes: [...types],
        sampleTitles: multi.docs.slice(0, 5).map((d) => ({
          collectionSlug: d.collectionSlug,
          title: d.title,
          hasExcerpt: Boolean(d.excerpt),
        })),
        kalendarForQ: byType.totalDocs,
        pastEvents: past.totalDocs,
        pastSample: past.docs.slice(0, 3).map((d) => ({
          title: d.title,
          endDate: d.endDate || d.startDate,
          eventIsPast: d.eventIsPast,
        })),
        nazemiTotal: (
          await payload.find({
            collection: 'search',
            limit: 1,
            where: { site: { equals: nazemi.id } },
          })
        ).totalDocs,
        brnoTotal: brnoCount,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

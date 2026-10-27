import 'dotenv/config'

import { getPayload } from 'payload'

import config from '@payload-config'
import { MAIN_SITE_SLUG } from '@/lib/site-context'

const SAMPLES = [
  'igelitart', // 1 file → doc CTA
  'globalni-cile-udrzitelneho-rozvoje-17-aktivit-k-17-cilum', // 19 files → CTA block
  'watoto-multikulturni-vychova-pro-nejmensi-0', // shop only
  'plakat-greenwashing',
  'plakat-greenwashing-7979',
]

async function main() {
  const payload = await getPayload({ config })
  const siteRes = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: MAIN_SITE_SLUG } },
  })
  const siteId = siteRes.docs[0]?.id
  if (!siteId) throw new Error('main site missing')

  const metodika = await payload.find({
    collection: 'publication-types',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: 'metodika' } },
  })
  const typeId = metodika.docs[0]?.id
  console.log('Metodika type', typeId)

  const listed = await payload.find({
    collection: 'publikace',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        { site: { equals: siteId } },
        { types: { contains: typeId } },
        { _status: { equals: 'published' } },
      ],
    },
  })
  console.log('published Metodika count', listed.docs.length)

  for (const slug of SAMPLES) {
    const res = await payload.find({
      collection: 'publikace',
      depth: 1,
      limit: 1,
      overrideAccess: true,
      where: {
        and: [{ slug: { equals: slug } }, { site: { equals: siteId } }],
      },
    })
    const doc = res.docs[0]
    if (!doc) {
      console.log('MISSING', slug)
      continue
    }
    const contentStr = JSON.stringify(doc.content || {})
    const ctaBlocks = (contentStr.match(/"blockType":"callToAction"/g) || []).length
    const actionsInBlock = (contentStr.match(/"linkType":"external"/g) || []).length
    const types = (doc.types || [])
      .map((t) => (typeof t === 'object' && t && 'slug' in t ? t.slug : t))
      .join(',')
    console.log(
      JSON.stringify({
        slug,
        status: doc._status,
        types,
        cover: Boolean(doc.coverImage),
        ctas: (doc.ctas || []).map((c) => ({
          title: c.title,
          href: (c.href || c.url || '').slice(0, 70),
        })),
        ctaBlocks,
        actionsInBlock,
        excerpt: (doc.excerpt || '').slice(0, 60),
      }),
    )
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

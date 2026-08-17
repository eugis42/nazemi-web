/**
 * Upload favicon assets and attach them to the main site (Branding → Favicon).
 * Usage: pnpm exec tsx scripts/populate-site-favicons.ts
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '@payload-config'
import { MAIN_SITE_SLUG } from '../src/lib/site-context'
import { upsertMedia } from '../src/seed/utils'

async function main() {
  const payload = await getPayload({ config })

  const [icon, apple] = await Promise.all([
    upsertMedia({
      alt: 'Favicon NaZemi (SVG)',
      file: 'favicon.svg',
      payload,
    }),
    upsertMedia({
      alt: 'Apple Touch Icon NaZemi',
      file: 'apple-touch-icon.png',
      payload,
    }),
  ])

  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    draft: true,
    limit: 10,
    overrideAccess: true,
    pagination: false,
    where: { slug: { equals: MAIN_SITE_SLUG } },
  })

  const site = sites.docs[0]
  if (!site) {
    throw new Error(`Site slug=${MAIN_SITE_SLUG} not found`)
  }

  await payload.update({
    id: site.id,
    collection: 'sites',
    data: {
      favicon: {
        appleTouchIcon: apple.id,
        icon: icon.id,
      },
    },
    draft: false,
    overrideAccess: true,
  })

  // Also update draft version if present
  await payload.update({
    id: site.id,
    collection: 'sites',
    data: {
      favicon: {
        appleTouchIcon: apple.id,
        icon: icon.id,
      },
    },
    draft: true,
    overrideAccess: true,
  })

  payload.logger.info({
    msg: 'Favicon attached to main site',
    siteId: site.id,
    iconId: icon.id,
    appleId: apple.id,
    iconUrl: icon.url,
    appleUrl: apple.url,
  })

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

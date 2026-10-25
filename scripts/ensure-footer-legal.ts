/**
 * Ensure empty legal pages exist on each site and wire Sites.footerMenu.
 *
 * Usage: npx tsx scripts/ensure-footer-legal.ts
 */
import 'dotenv/config'

import { getPayload } from 'payload'
import config from '@payload-config'

import { FOOTER_LEGAL_PAGES } from '../src/lib/footer-legal'
import { richText } from '../src/seed/html'

async function main() {
  const payload = await getPayload({ config })

  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
  })

  for (const site of sites.docs) {
    const menuItems: {
      label: string
      linkType: 'internal'
      reference: { relationTo: 'stranky'; value: number | string }
    }[] = []

    for (const page of FOOTER_LEGAL_PAGES) {
      const existing = await payload.find({
        collection: 'stranky',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        pagination: false,
        where: {
          and: [{ site: { equals: site.id } }, { slug: { equals: page.slug } }],
        },
      })

      let doc = existing.docs[0]
      if (!doc) {
        doc = await payload.create({
          collection: 'stranky',
          data: {
            _status: 'published',
            content: [
              {
                blockType: 'richText',
                // Lexical rejects fully empty roots — nbsp keeps page blank visually.
                content: richText('\u00a0'),
              },
            ],
            isHomepage: false,
            site: site.id,
            slug: page.slug,
            title: page.title,
          },
          draft: false,
          overrideAccess: true,
        })
        console.log(`+ stranka ${page.slug} @ ${site.slug}`)
      } else {
        console.log(`= stranka ${page.slug} @ ${site.slug} (id ${doc.id})`)
      }

      menuItems.push({
        label: page.title,
        linkType: 'internal',
        reference: { relationTo: 'stranky', value: doc.id },
      })
    }

    const current = Array.isArray(site.footerMenu) ? site.footerMenu : []
    // Only overwrite when empty — don't clobber editor tweaks.
    if (current.length === 0) {
      await payload.update({
        collection: 'sites',
        id: site.id,
        data: { footerMenu: menuItems },
        overrideAccess: true,
      })
      console.log(`→ footerMenu set on ${site.slug}`)
    } else {
      console.log(`= footerMenu already set on ${site.slug} (${current.length} items)`)
    }
  }

  await payload.db.destroy?.()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

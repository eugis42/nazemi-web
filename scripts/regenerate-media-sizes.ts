/**
 * Regenerate Payload upload sizes for every media doc (new sizes / focal re-apply).
 *
 * Usage: npx tsx scripts/regenerate-media-sizes.ts
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '@payload-config'

const staticDir = path.resolve(process.cwd(), 'media')
const pageSize = 25

async function main() {
  const payload = await getPayload({ config })

  let page = 1
  let processed = 0
  let skipped = 0
  let failed = 0

  for (;;) {
    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: pageSize,
      page,
      pagination: true,
    })

    for (const doc of result.docs) {
      const filename = doc.filename
      if (!filename) {
        skipped++
        continue
      }

      const filePath = path.join(staticDir, filename)
      if (!fs.existsSync(filePath)) {
        payload.logger.error({ msg: 'Missing media file on disk', id: doc.id, filePath })
        failed++
        continue
      }

      try {
        await payload.update({
          collection: 'media',
          id: doc.id,
          data: {
            alt: doc.alt,
            caption: doc.caption,
            focalX: doc.focalX,
            focalY: doc.focalY,
          },
          filePath,
          overwriteExistingFiles: true,
        })
        processed++
        payload.logger.info(`Regenerated ${doc.id} (${filename})`)
      } catch (err) {
        failed++
        payload.logger.error({ msg: `Failed ${doc.id} (${filename})`, err })
      }
    }

    if (!result.hasNextPage) break
    page += 1
  }

  payload.logger.info({ msg: 'Media size regeneration done', processed, skipped, failed })
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

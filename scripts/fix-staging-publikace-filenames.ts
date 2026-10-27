/**
 * After push-publikace-staging import, Payload may rename files (…-1.ext).
 * Rewrite CTA/content hrefs to the real staging filenames.
 */
import 'dotenv/config'

import fs from 'node:fs'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '@payload-config'
import { MAIN_SITE_SLUG } from '@/lib/site-context'

type Pair = { from: string; to: string }

async function main() {
  const bundle = JSON.parse(
    fs.readFileSync('.cache/publikace-staging/bundle.json', 'utf8'),
  ) as { media: { filename: string }[] }

  const payload = await getPayload({ config })
  const site = (
    await payload.find({
      collection: 'sites',
      where: { slug: { equals: MAIN_SITE_SLUG } },
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]
  if (!site) throw new Error('site missing')

  const renamePairs: Pair[] = []
  for (const src of bundle.media) {
    const ext = path.extname(src.filename)
    const base = src.filename.slice(0, -ext.length)
    const candidates = [src.filename, `${base}-1${ext}`]
    let stagingName: string | null = null
    for (const cand of candidates) {
      const found = await payload.find({
        collection: 'media',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: { filename: { equals: cand } },
      })
      if (found.docs[0]?.filename) {
        stagingName = found.docs[0].filename
        break
      }
    }
    if (stagingName && stagingName !== src.filename) {
      renamePairs.push({ from: src.filename, to: stagingName })
    }
  }

  console.log('rename pairs', renamePairs.length)
  fs.mkdirSync('.cache/publikace-staging', { recursive: true })
  fs.writeFileSync(
    '.cache/publikace-staging/filename-rewrites.json',
    JSON.stringify(renamePairs, null, 2),
  )

  const rewrite = (value: unknown): unknown => {
    if (typeof value === 'string') {
      let s = value
      for (const { from, to } of renamePairs) s = s.split(from).join(to)
      return s
    }
    if (Array.isArray(value)) return value.map(rewrite)
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = rewrite(v)
      }
      return out
    }
    return value
  }

  const pubs = await payload.find({
    collection: 'publikace',
    depth: 0,
    draft: true,
    limit: 200,
    overrideAccess: true,
    pagination: false,
    where: { site: { equals: site.id } },
  })

  let updated = 0
  for (const pub of pubs.docs) {
    const nextContent = rewrite(pub.content)
    const nextCtas = rewrite(pub.ctas)
    const changed =
      JSON.stringify(nextContent) !== JSON.stringify(pub.content) ||
      JSON.stringify(nextCtas) !== JSON.stringify(pub.ctas)
    if (!changed) continue
    await payload.update({
      collection: 'publikace',
      id: pub.id,
      data: { content: nextContent as never, ctas: nextCtas as never },
      draft: pub._status === 'draft',
      overrideAccess: true,
    })
    updated += 1
    console.log('rewrote', pub.slug)
  }
  console.log({ updated, pubs: pubs.docs.length })

  // VPS: ln -s realName aliasName when alias missing
  const lines = renamePairs.map((p) => `${p.to}\t${p.from}`)
  fs.writeFileSync('.cache/publikace-staging/vps-symlinks.tsv', lines.join('\n') + '\n')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

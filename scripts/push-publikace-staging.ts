/**
 * Push main-site Publikace (+ linked media) from local DB → staging DB.
 * Media files must then be scp'd to VPS media/ (script prints the list).
 *
 *   # 1) export from local
 *   npx tsx scripts/push-publikace-staging.ts --export
 *
 *   # 2) import into staging (tunnel DATABASE_URL)
 *   DATABASE_URL='postgres://…@127.0.0.1:15433/nazemi' \
 *     npx tsx scripts/push-publikace-staging.ts --import
 */
import 'dotenv/config'

import fs from 'node:fs'
import path from 'node:path'

import { getPayload, type Payload } from 'payload'

import config from '@payload-config'
import { MAIN_SITE_SLUG } from '@/lib/site-context'

const OUT_DIR = path.resolve(process.cwd(), '.cache/publikace-staging')
const BUNDLE = path.join(OUT_DIR, 'bundle.json')
const MEDIA_DIR = path.resolve(process.cwd(), 'media')

type MediaRow = {
  alt?: string | null
  caption?: string | null
  filename: string
  id: number
  mimeType?: string | null
}

type PubRow = Record<string, unknown> & {
  _status?: string | null
  content?: unknown
  coverImage?: number | null
  ctas?: { href?: string | null; title?: string | null; url?: string | null }[] | null
  id: number
  slug: string
  title: string
}

type Bundle = {
  media: MediaRow[]
  pubs: PubRow[]
  siteSlug: string
}

const SEED_SLUGS = new Set([
  'ekonomie-spoluprace',
  'facilitace-v-komunitach',
  'globalka',
  'globani-metodika',
  'klima-a-spravedlnost',
  'nenasilna-komunikace-v-skole',
  'nerovnosti-v-cesku',
  'obcanska-odolnost-prirucka',
  'odpor-bez-nasili',
  'planetarni-meze',
  'prace-bez-bosu',
  'revue-nerust',
  'seberizeni-pruvodce',
  'transformativni-vzdelavani',
  'udrzitelna-spotreba',
  'vrchol-je-dno',
])

function collectMediaIdsFromDoc(doc: unknown, out: Set<number>) {
  const s = JSON.stringify(doc ?? {})
  for (const m of s.matchAll(/"relationTo":"media","value":(\d+)/g)) out.add(Number(m[1]))
  for (const m of s.matchAll(/"value":(\d+),"relationTo":"media"/g)) out.add(Number(m[1]))
  if (doc && typeof doc === 'object' && 'coverImage' in doc) {
    const c = (doc as { coverImage?: unknown }).coverImage
    if (typeof c === 'number') out.add(c)
  }
}

function filenamesFromHrefs(doc: unknown, out: Set<string>) {
  const s = JSON.stringify(doc ?? {})
  for (const m of s.matchAll(/\/api\/media\/file\/([^\\"?#]+)/g)) {
    out.add(decodeURIComponent(m[1]))
  }
}

function rewriteMediaHrefs(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(
      /https?:\/\/[^/]+\/api\/media\/file\//g,
      '/api/media/file/',
    )
  }
  if (Array.isArray(value)) return value.map(rewriteMediaHrefs)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = rewriteMediaHrefs(v)
    return out
  }
  return value
}

function remapMediaIds(value: unknown, idMap: Map<number, number>): unknown {
  if (Array.isArray(value)) return value.map((v) => remapMediaIds(v, idMap))
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (obj.relationTo === 'media' && typeof obj.value === 'number') {
      const mapped = idMap.get(obj.value)
      return mapped != null ? { ...obj, value: mapped } : obj
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) out[k] = remapMediaIds(v, idMap)
    return out
  }
  return value
}

async function runExport() {
  const payload = await getPayload({ config })
  const siteRes = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: MAIN_SITE_SLUG } },
  })
  const siteId = siteRes.docs[0]?.id
  if (!siteId) throw new Error('local main site missing')

  const pubsRes = await payload.find({
    collection: 'publikace',
    depth: 0,
    draft: true,
    limit: 200,
    overrideAccess: true,
    pagination: false,
    where: { site: { equals: siteId } },
  })
  const pubs = pubsRes.docs as unknown as PubRow[]
  console.log(`export pubs=${pubs.length}`)

  const mediaIds = new Set<number>()
  const hrefFiles = new Set<string>()
  for (const pub of pubs) {
    collectMediaIdsFromDoc(pub, mediaIds)
    filenamesFromHrefs(pub, hrefFiles)
  }

  const mediaByFilename = new Map<string, MediaRow>()
  for (const id of mediaIds) {
    try {
      const m = await payload.findByID({
        collection: 'media',
        id,
        depth: 0,
        overrideAccess: true,
      })
      if (m?.filename) {
        mediaByFilename.set(m.filename, {
          alt: m.alt,
          caption: m.caption,
          filename: m.filename,
          id: m.id,
          mimeType: m.mimeType,
        })
      }
    } catch {
      /* skip */
    }
  }

  for (const filename of hrefFiles) {
    if (mediaByFilename.has(filename)) continue
    const found = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { filename: { equals: filename } },
    })
    const m = found.docs[0]
    if (m?.filename) {
      mediaByFilename.set(m.filename, {
        alt: m.alt,
        caption: m.caption,
        filename: m.filename,
        id: m.id,
        mimeType: m.mimeType,
      })
    }
  }

  const media = [...mediaByFilename.values()]
  const missing = media.filter((m) => !fs.existsSync(path.join(MEDIA_DIR, m.filename)))
  if (missing.length) {
    throw new Error(`missing local media files: ${missing.map((m) => m.filename).join(', ')}`)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const bundle: Bundle = { media, pubs, siteSlug: MAIN_SITE_SLUG }
  fs.writeFileSync(BUNDLE, JSON.stringify(bundle))
  fs.writeFileSync(
    path.join(OUT_DIR, 'media-files.txt'),
    media.map((m) => m.filename).join('\n') + '\n',
  )
  console.log(`wrote ${BUNDLE} media=${media.length}`)
  await payload.db.destroy?.()
}

async function ensureMetodika(payload: Payload) {
  const existing = await payload.find({
    collection: 'publication-types',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: 'metodika' } },
  })
  if (existing.docs[0]) return existing.docs[0].id
  const created = await payload.create({
    collection: 'publication-types',
    data: { slug: 'metodika', title: 'Metodika' },
    overrideAccess: true,
  })
  return created.id
}

async function upsertMedia(
  payload: Payload,
  source: MediaRow,
): Promise<{ id: number; files: string[] }> {
  const filePath = path.join(MEDIA_DIR, source.filename)
  const existing = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { filename: { equals: source.filename } },
  })
  if (existing.docs[0]) {
    const doc = existing.docs[0]
    const files = [doc.filename!, ...Object.values(doc.sizes || {}).map((s) => s?.filename).filter(Boolean)] as string[]
    return { id: doc.id, files }
  }

  const buf = fs.readFileSync(filePath)
  const created = await payload.create({
    collection: 'media',
    data: {
      alt: source.alt || source.filename.replace(/\.[^.]+$/, ''),
      ...(source.caption ? { caption: source.caption } : {}),
    },
    file: {
      data: buf,
      mimetype: source.mimeType || 'application/octet-stream',
      name: source.filename,
      size: buf.byteLength,
    },
    overrideAccess: true,
  })
  const files = [
    created.filename!,
    ...Object.values(created.sizes || {})
      .map((s) => s?.filename)
      .filter(Boolean),
  ] as string[]
  return { id: created.id, files }
}

async function runImport() {
  if (!fs.existsSync(BUNDLE)) throw new Error(`missing ${BUNDLE} — run --export first`)
  const bundle = JSON.parse(fs.readFileSync(BUNDLE, 'utf8')) as Bundle
  const payload = await getPayload({ config })

  const siteRes = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: MAIN_SITE_SLUG } },
  })
  const siteId = siteRes.docs[0]?.id
  if (!siteId) throw new Error('staging main site missing')

  const metodikaId = await ensureMetodika(payload)

  // Delete seed dummies + any slug we are about to replace + leftover main pubs? 
  // Replace set: delete all main-site publikace (staging pubs = imported set only).
  const existing = await payload.find({
    collection: 'publikace',
    depth: 0,
    draft: true,
    limit: 200,
    overrideAccess: true,
    pagination: false,
    where: { site: { equals: siteId } },
  })
  console.log(`delete staging pubs=${existing.docs.length}`)
  for (const doc of existing.docs) {
    await payload.delete({ collection: 'publikace', id: doc.id, overrideAccess: true })
    console.log('  deleted', doc.slug, SEED_SLUGS.has(String(doc.slug)) ? '(seed)' : '')
  }

  const idMap = new Map<number, number>()
  const filesToShip = new Set<string>()
  console.log(`upsert media=${bundle.media.length}`)
  for (const m of bundle.media) {
    const { id, files } = await upsertMedia(payload, m)
    idMap.set(m.id, id)
    for (const f of files) filesToShip.add(f)
    console.log('  media', m.filename, '→', id)
  }

  console.log(`create pubs=${bundle.pubs.length}`)
  for (const pub of bundle.pubs) {
    const coverSrc = typeof pub.coverImage === 'number' ? pub.coverImage : null
    const coverMapped = coverSrc != null ? idMap.get(coverSrc) : null
    if (coverMapped == null) {
      console.warn('  SKIP no cover', pub.slug)
      continue
    }

    let content = rewriteMediaHrefs(pub.content)
    content = remapMediaIds(content, idMap)

    const ctas = Array.isArray(pub.ctas)
      ? (rewriteMediaHrefs(pub.ctas) as PubRow['ctas'])
      : []

    const published = pub._status !== 'draft'
    await payload.create({
      collection: 'publikace',
      data: {
        _status: published ? 'published' : 'draft',
        authorName: (pub.authorName as string) || null,
        content: content as never,
        coverImage: coverMapped,
        ctas: ctas as never,
        description: (pub.description as string) || null,
        excerpt: null,
        metaTitle: (pub.metaTitle as string) || null,
        site: siteId,
        slug: pub.slug,
        title: pub.title,
        topics: [],
        types: [metodikaId],
      } as never,
      draft: !published,
      overrideAccess: true,
    })
    console.log('  created', pub.slug)
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'media-to-scp.txt'),
    [...filesToShip].sort().join('\n') + '\n',
  )
  console.log(`media files to scp: ${filesToShip.size} → ${path.join(OUT_DIR, 'media-to-scp.txt')}`)
  await payload.db.destroy?.()
}

const mode = process.argv.includes('--import')
  ? 'import'
  : process.argv.includes('--export')
    ? 'export'
    : null

if (!mode) {
  console.error('Usage: --export | --import')
  process.exit(1)
}

const run = mode === 'export' ? runExport : runImport
run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

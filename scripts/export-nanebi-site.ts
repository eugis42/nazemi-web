/**
 * Export NaNebi site (pages + referenced media) from local DB → .cache/nanebi-sync/
 * Does not touch other sites. Usage: npx tsx scripts/export-nanebi-site.ts
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'
import config from '@payload-config'

const SITE_SLUG = 'nanebi'
const outDir = path.resolve('.cache/nanebi-sync')
const mediaOut = path.join(outDir, 'files')

const UPLOAD_KEYS = new Set([
  'logo',
  'homepageBackground',
  'sharingImage',
  'coverImage',
  'image',
  'images',
  'icon',
  'appleTouchIcon',
  'media',
  'file',
  'photo',
])

function collectMediaIds(value: unknown, into: Set<number>, keyHint?: string) {
  if (value == null) return
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (keyHint && UPLOAD_KEYS.has(keyHint)) into.add(value)
    return
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      for (const item of value) collectMediaIds(item, into, keyHint)
      return
    }
    const obj = value as Record<string, unknown>
    // Populated upload
    if (
      typeof obj.id === 'number' &&
      typeof obj.filename === 'string' &&
      (obj.mimeType || obj.url || obj.filesize != null)
    ) {
      into.add(obj.id)
    }
    for (const [k, v] of Object.entries(obj)) collectMediaIds(v, into, k)
  }
}

function stripUploadToId(value: unknown, idMap: Map<number, number>): unknown {
  if (value == null) return value
  if (Array.isArray(value)) return value.map((v) => stripUploadToId(v, idMap))
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.id === 'number' && typeof obj.filename === 'string' && obj.mimeType) {
      const mapped = idMap.get(obj.id)
      return mapped ?? obj.id
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) out[k] = stripUploadToId(v, idMap)
    return out
  }
  return value
}

const payload = await getPayload({ config })

const sites = await payload.find({
  collection: 'sites',
  where: { slug: { equals: SITE_SLUG } },
  depth: 2,
  limit: 1,
  overrideAccess: true,
})
const site = sites.docs[0]
if (!site) throw new Error(`Site slug=${SITE_SLUG} not found locally`)

const pages = await payload.find({
  collection: 'stranky',
  where: { site: { equals: site.id } },
  depth: 2,
  limit: 100,
  overrideAccess: true,
})

const mediaIds = new Set<number>()
collectMediaIds(site, mediaIds)
for (const page of pages.docs) collectMediaIds(page, mediaIds)

// Rels / site FKs catch upload arrays that stayed as bare ids at this depth
const pageIds = pages.docs.map((p) => p.id)
const { default: pg } = await import('pg')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  if (pageIds.length) {
    const r = await client.query<{ media_id: number }>(
      `SELECT DISTINCT media_id FROM stranky_rels
       WHERE parent_id = ANY($1::int[]) AND media_id IS NOT NULL`,
      [pageIds],
    )
    for (const row of r.rows) mediaIds.add(row.media_id)
  }
  const s = await client.query<{ id: number }>(
    `SELECT logo_id AS id FROM sites WHERE id=$1 AND logo_id IS NOT NULL
     UNION SELECT homepage_background_id FROM sites WHERE id=$1 AND homepage_background_id IS NOT NULL
     UNION SELECT favicon_icon_id FROM sites WHERE id=$1 AND favicon_icon_id IS NOT NULL
     UNION SELECT favicon_apple_touch_icon_id FROM sites WHERE id=$1 AND favicon_apple_touch_icon_id IS NOT NULL
     UNION SELECT sharing_image_id FROM sites WHERE id=$1 AND sharing_image_id IS NOT NULL`,
    [site.id],
  )
  for (const row of s.rows) if (row.id) mediaIds.add(row.id)
} finally {
  await client.end()
}

fs.mkdirSync(mediaOut, { recursive: true })
const mediaDir = path.resolve(process.cwd(), 'media')
const manifest: { id: number; filename: string; mimeType?: string }[] = []

for (const id of [...mediaIds].sort((a, b) => a - b)) {
  const doc = await payload.findByID({
    collection: 'media',
    id,
    depth: 0,
    overrideAccess: true,
  })
  const filename = doc.filename
  if (!filename) continue
  const src = path.join(mediaDir, filename)
  if (!fs.existsSync(src)) {
    console.warn(`skip missing file media/${filename} (id=${id})`)
    continue
  }
  fs.copyFileSync(src, path.join(mediaOut, filename))
  // also copy sized variants if present
  const base = filename.replace(/\.[^.]+$/, '')
  for (const f of fs.readdirSync(mediaDir)) {
    if (f.startsWith(base + '-') || f === filename) {
      const from = path.join(mediaDir, f)
      const to = path.join(mediaOut, f)
      if (!fs.existsSync(to)) fs.copyFileSync(from, to)
    }
  }
  manifest.push({
    id,
    filename,
    mimeType: typeof doc.mimeType === 'string' ? doc.mimeType : undefined,
  })
}

// Identity map for export packaging (import rebuilds real map)
const identity = new Map(manifest.map((m) => [m.id, m.id]))
const siteExport = stripUploadToId(
  {
    ...site,
    id: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  },
  identity,
)
const pagesExport = pages.docs.map((p) =>
  stripUploadToId(
    {
      ...p,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    },
    identity,
  ),
)

fs.writeFileSync(
  path.join(outDir, 'export.json'),
  JSON.stringify(
    {
      siteSlug: SITE_SLUG,
      localSiteId: site.id,
      media: manifest,
      site: siteExport,
      pages: pagesExport,
    },
    null,
    2,
  ),
)

console.log(
  `Exported site=${SITE_SLUG} pages=${pages.docs.length} mediaFiles=${manifest.length} → ${outDir}`,
)
process.exit(0)

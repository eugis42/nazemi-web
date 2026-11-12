/**
 * Import NaNebi export from .cache/nanebi-sync/ into current DATABASE_URL.
 * Upserts by site slug + page slug. Never touches other sites.
 *
 * Sites payload.update hangs on novy (afterChange → ensureCollectionHomesForSite /
 * drafts). Site branding + menus go via SQL; pages/media use Payload Local API.
 *
 * Usage (on VPS after upload):
 *   npx tsx scripts/import-nanebi-site.ts
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { getPayload } from 'payload'
import config from '@payload-config'

const SITE_SLUG = 'nanebi'
const inDir = path.resolve('.cache/nanebi-sync')
const filesDir = path.join(inDir, 'files')

type ExportFile = {
  siteSlug: string
  media: { id: number; filename: string; mimeType?: string }[]
  site: Record<string, unknown>
  pages: Record<string, unknown>[]
}

function rewriteRefs(
  value: unknown,
  mediaMap: Map<number, number>,
  pageSlugMap: Map<string, number>,
): unknown {
  if (value == null) return value
  if (typeof value === 'number') {
    return mediaMap.has(value) ? mediaMap.get(value)! : value
  }
  if (Array.isArray(value)) {
    return value.map((v) => rewriteRefs(v, mediaMap, pageSlugMap))
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>

    if (typeof obj.relationTo === 'string' && 'value' in obj) {
      if (obj.relationTo === 'stranky') {
        const v = obj.value
        let pageId: number | null = null
        if (v && typeof v === 'object' && typeof (v as { __pageSlug?: string }).__pageSlug === 'string') {
          pageId = pageSlugMap.get((v as { __pageSlug: string }).__pageSlug) ?? null
        } else if (v && typeof v === 'object' && typeof (v as { slug?: string }).slug === 'string') {
          pageId = pageSlugMap.get((v as { slug: string }).slug) ?? null
        } else if (typeof v === 'number') {
          pageId = null
        }
        return { relationTo: 'stranky', value: pageId }
      }
      if (obj.relationTo === 'media') {
        const v = obj.value
        if (typeof v === 'number') {
          return { relationTo: 'media', value: mediaMap.get(v) ?? v }
        }
        if (v && typeof v === 'object' && typeof (v as { id?: number }).id === 'number') {
          const id = (v as { id: number }).id
          return { relationTo: 'media', value: mediaMap.get(id) ?? id }
        }
      }
    }

    // Only resolve explicit page-slug markers from markPageSlugs — never
    // treat a full page document (slug+content) as a relation stub.
    if (typeof obj.__pageSlug === 'string') {
      return pageSlugMap.get(obj.__pageSlug) ?? null
    }
    if (typeof obj.id === 'number' && typeof obj.filename === 'string' && (obj.mimeType || obj.url)) {
      return mediaMap.get(obj.id) ?? obj.id
    }

    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'id' || k === 'createdAt' || k === 'updatedAt') continue
      out[k] = rewriteRefs(v, mediaMap, pageSlugMap)
    }
    return out
  }
  return value
}

function markPageSlugs(value: unknown): unknown {
  if (value == null) return value
  if (Array.isArray(value)) return value.map(markPageSlugs)
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (obj.relationTo === 'stranky' && obj.value && typeof obj.value === 'object') {
      const v = obj.value as Record<string, unknown>
      if (typeof v.slug === 'string') {
        return { relationTo: 'stranky', value: { __pageSlug: v.slug } }
      }
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) out[k] = markPageSlugs(v)
    return out
  }
  return value
}

const PAGE_KEEP = new Set([
  'title',
  'slug',
  'excerpt',
  'isHomepage',
  'content',
  'homepageContent',
  'coverImage',
  '_status',
  'site',
])

function pick(obj: Record<string, unknown>, keys: Set<string>) {
  const out: Record<string, unknown> = {}
  for (const k of keys) if (k in obj) out[k] = obj[k]
  return out
}

const raw = JSON.parse(fs.readFileSync(path.join(inDir, 'export.json'), 'utf8')) as ExportFile
if (raw.siteSlug !== SITE_SLUG) throw new Error(`Unexpected siteSlug ${raw.siteSlug}`)

const payload = await getPayload({ config })
const mediaDir = path.resolve(process.cwd(), 'media')
fs.mkdirSync(mediaDir, { recursive: true })

const standaloneMedia = path.resolve(process.cwd(), '.next/standalone/media')
try {
  fs.mkdirSync(path.dirname(standaloneMedia), { recursive: true })
  try {
    fs.unlinkSync(standaloneMedia)
  } catch {
    /* missing ok */
  }
  fs.symlinkSync(mediaDir, standaloneMedia)
} catch {
  /* local / no standalone */
}

const mediaMap = new Map<number, number>()

for (const item of raw.media) {
  const existingExact = await payload.find({
    collection: 'media',
    where: { filename: { equals: item.filename } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  let existing = existingExact.docs[0]
  if (!existing) {
    const base = item.filename.replace(/\.[^.]+$/, '')
    const ext = item.filename.slice(base.length)
    const fuzzy = await payload.find({
      collection: 'media',
      where: { filename: { like: `${base}%${ext}` } },
      limit: 20,
      depth: 0,
      overrideAccess: true,
      sort: '-createdAt',
    })
    existing = fuzzy.docs.find((d) => {
      const fn = String(d.filename || '')
      return fn === item.filename || new RegExp(`^${base}(-\\d+)?${ext.replace('.', '\\.')}$`).test(fn)
    })
  }
  if (existing) {
    mediaMap.set(item.id, existing.id as number)
    console.log(`media reuse ${item.filename} → ${existing.id} (${existing.filename})`)
    continue
  }
  const filePath = path.join(filesDir, item.filename)
  if (!fs.existsSync(filePath)) {
    console.warn(`missing file ${item.filename}, skip`)
    continue
  }
  for (const f of fs.readdirSync(filesDir)) {
    const base = item.filename.replace(/\.[^.]+$/, '')
    if (f === item.filename || f.startsWith(base + '-')) {
      fs.copyFileSync(path.join(filesDir, f), path.join(mediaDir, f))
    }
  }
  const created = await payload.create({
    collection: 'media',
    data: { alt: item.filename },
    filePath,
    overrideAccess: true,
  })
  mediaMap.set(item.id, created.id as number)
  console.log(`media create ${item.filename} → ${created.id} (${created.filename})`)
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
await db.connect()

const siteRow = await db.query<{ id: number }>(`SELECT id FROM sites WHERE slug=$1`, [SITE_SLUG])
let siteId: number
if (siteRow.rows[0]) {
  siteId = siteRow.rows[0].id
  console.log(`site exists id=${siteId}`)
} else {
  const created = await db.query<{ id: number }>(
    `INSERT INTO sites (name, slug, site_type, subdomain, primary_color, primary_background_color, accent_color, _status, created_at, updated_at)
     VALUES ($1,$2,'subsite',$3,$4,$5,$6,'published',NOW(),NOW()) RETURNING id`,
    [
      String(raw.site.name || 'NaNebi'),
      SITE_SLUG,
      String(raw.site.subdomain || 'nanebi'),
      String(raw.site.primaryColor || '#5576E4'),
      String(raw.site.primaryBackgroundColor || '#FFFFFF'),
      String(raw.site.accentColor || '#FFD966'),
    ],
  )
  siteId = created.rows[0].id
  console.log(`site sql-create id=${siteId}`)
}

const logoId = typeof raw.site.logo === 'number' ? mediaMap.get(raw.site.logo) : null
const bgId =
  typeof raw.site.homepageBackground === 'number' ? mediaMap.get(raw.site.homepageBackground) : null
const donate = (raw.site.donateCta || {}) as Record<string, unknown>
const enabled = (raw.site.enabledCollections || {}) as Record<string, boolean>

await db.query(
  `UPDATE sites SET
    name=$2,
    site_type='subsite',
    subdomain=$3,
    logo_id=$4,
    homepage_background_id=$5,
    logo_navbar_padding=$6,
    primary_color=$7,
    primary_background_color=$8,
    accent_color=$9,
    description=$10,
    meta_title=$11,
    search_fold=$12,
    donate_cta_title=$13,
    donate_cta_body=$14,
    donate_cta_button_label=$15,
    donate_cta_href=$16,
    donate_cta_background_color=$17,
    enabled_collections_aktuality=$18,
    enabled_collections_kalendar=$19,
    enabled_collections_projekty=$20,
    enabled_collections_workshopy=$21,
    enabled_collections_publikace=$22,
    enabled_collections_lide=$23,
    _status='published',
    updated_at=NOW()
  WHERE id=$1`,
  [
    siteId,
    String(raw.site.name || 'NaNebi'),
    String(raw.site.subdomain || 'nanebi'),
    logoId ?? null,
    bgId ?? null,
    Number(raw.site.logoNavbarPadding ?? 0),
    String(raw.site.primaryColor || '#5576E4'),
    String(raw.site.primaryBackgroundColor || '#FFFFFF'),
    String(raw.site.accentColor || '#FFD966'),
    typeof raw.site.description === 'string' ? raw.site.description : null,
    typeof raw.site.metaTitle === 'string' ? raw.site.metaTitle : null,
    typeof raw.site.searchFold === 'string' ? raw.site.searchFold : null,
    typeof donate.title === 'string' ? donate.title : null,
    typeof donate.body === 'string' ? donate.body : null,
    typeof donate.buttonLabel === 'string' ? donate.buttonLabel : null,
    typeof donate.href === 'string' ? donate.href : null,
    typeof donate.backgroundColor === 'string' ? donate.backgroundColor : null,
    Boolean(enabled.aktuality),
    Boolean(enabled.kalendar),
    Boolean(enabled.projekty),
    Boolean(enabled.workshopy),
    Boolean(enabled.publikace),
    Boolean(enabled.lide),
  ],
)
console.log('site sql branding ok')

await db.query(`DELETE FROM sites_additional_colors WHERE _parent_id=$1`, [siteId])
const colors = Array.isArray(raw.site.additionalColors) ? raw.site.additionalColors : []
for (let i = 0; i < colors.length; i++) {
  const c = colors[i] as { id?: string; label?: string; value?: string }
  await db.query(
    `INSERT INTO sites_additional_colors (_order, _parent_id, id, label, value) VALUES ($1,$2,$3,$4,$5)`,
    [i + 1, siteId, c.id || `color-${i}`, c.label || '', c.value || ''],
  )
}
console.log(`site colors ${colors.length}`)

// Pages via Payload. Non-homepages first so homepage CTAs can resolve.
const pageSlugMap = new Map<string, number>()
const pagesOrdered = [
  ...raw.pages.filter((p) => !p.isHomepage),
  ...raw.pages.filter((p) => p.isHomepage),
]

async function upsertPage(page: Record<string, unknown>, map: Map<string, number>) {
  const slug = String(page.slug)
  console.log(`page upsert ${slug}…`)
  const slim = pick(page, PAGE_KEEP)
  const marked = markPageSlugs(slim) as Record<string, unknown>
  const data = rewriteRefs(marked, mediaMap, map) as Record<string, unknown>
  data.site = siteId
  data.slug = slug
  data._status = page._status ?? 'published'
  if (data.isHomepage) {
    data.content = Array.isArray(data.content) ? data.content : []
  } else if (!Array.isArray(data.content) || data.content.length === 0) {
    throw new Error(`page ${slug} missing content blocks`)
  }
  delete data.id

  const existing = await payload.find({
    collection: 'stranky',
    where: {
      and: [{ site: { equals: siteId } }, { slug: { equals: slug } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.docs[0]) {
    const id = existing.docs[0].id as number
    await payload.update({
      collection: 'stranky',
      id,
      data,
      overrideAccess: true,
      context: { skipHomepageGuard: true },
    })
    pageSlugMap.set(slug, id)
    console.log(`page update ${slug} → ${id}`)
  } else {
    const created = await payload.create({
      collection: 'stranky',
      data,
      overrideAccess: true,
      context: { skipHomepageGuard: true },
    })
    pageSlugMap.set(slug, created.id as number)
    console.log(`page create ${slug} → ${created.id}`)
  }
}

for (const page of pagesOrdered) {
  await upsertPage(page, pageSlugMap)
}

// Menu via SQL (avoid sites payload.update hang)
await db.query(`DELETE FROM sites_rels WHERE parent_id=$1 AND path LIKE 'mainMenu%'`, [siteId])
await db.query(`DELETE FROM sites_main_menu WHERE _parent_id=$1`, [siteId])
await db.query(`DELETE FROM sites_rels WHERE parent_id=$1 AND path LIKE 'secondaryMenu%'`, [siteId])
await db.query(`DELETE FROM sites_secondary_menu WHERE _parent_id=$1`, [siteId])

const mainMenu = Array.isArray(raw.site.mainMenu) ? raw.site.mainMenu : []
for (let i = 0; i < mainMenu.length; i++) {
  const item = mainMenu[i] as {
    id?: string
    label?: string
    href?: string | null
    linkType?: string
    depth?: number
    reference?: { relationTo?: string; value?: unknown }
  }
  const rowId = item.id || `menu-${i}`
  await db.query(
    `INSERT INTO sites_main_menu (_order, _parent_id, id, label, href, link_type, depth)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      i + 1,
      siteId,
      rowId,
      item.label || '',
      item.href ?? null,
      item.linkType || 'internal',
      item.depth ?? 0,
    ],
  )
  let pageId: number | null = null
  const ref = item.reference
  if (ref?.relationTo === 'stranky') {
    const v = ref.value
    if (v && typeof v === 'object' && typeof (v as { slug?: string }).slug === 'string') {
      pageId = pageSlugMap.get((v as { slug: string }).slug) ?? null
    }
  }
  if (pageId != null) {
    await db.query(
      `INSERT INTO sites_rels (parent_id, path, stranky_id) VALUES ($1,$2,$3)`,
      [siteId, `mainMenu.${i}.reference`, pageId],
    )
  }
}
console.log(`site menu ${mainMenu.length} items`)

await db.end()

console.log('NaNebi import done', {
  siteId,
  pages: [...pageSlugMap.entries()],
  mediaMapped: mediaMap.size,
})
process.exit(0)

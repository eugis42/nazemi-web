/**
 * One-way site sync: SOURCE Postgres → local, single site slug only.
 * Other sites' docs untouched. Media upserted by filename (never deleted).
 *
 * Usage:
 *   # restore staging dump into nazemi_novy_src, then:
 *   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/nazemi_novy_src \
 *     npx tsx scripts/sync-site-from-db.ts --export flowmakers
 *
 *   MEDIA_BASE_URL=https://novy.nazemi.cz \
 *     npx tsx scripts/sync-site-from-db.ts --import flowmakers
 *
 *   # or both (spawns export against SOURCE_DATABASE_URL, then import):
 *   SOURCE_DATABASE_URL=postgres://.../nazemi_novy_src \
 *   MEDIA_BASE_URL=https://novy.nazemi.cz \
 *     npx tsx scripts/sync-site-from-db.ts flowmakers
 */
import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

import { getPayload, type Payload, type CollectionSlug } from 'payload'
import config from '@payload-config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const CACHE = join(ROOT, '.cache', 'site-sync')

const SITE_COLLECTIONS = [
  'prehledy',
  'stranky',
  'aktuality',
  'kalendar',
  'workshopy',
  'lide',
  'publikace',
  'projekty',
] as const

const TAXONOMIES = ['tags', 'workshop-audiences', 'publication-types'] as const

type AnyDoc = Record<string, unknown>

const STRIP_KEYS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'collection',
  'filesize',
  'width',
  'height',
  'focalX',
  'focalY',
  'sizes',
  // NOTE: do NOT strip `url` — CTAs / social links use it. Media rows are
  // handled separately and never passed through stripMeta for create.
  'thumbnailURL',
  'filename',
  'mimeType',
  'prefix',
])

const MEDIA_FIELD_KEYS = new Set([
  'image',
  'logo',
  'icon',
  'appleTouchIcon',
  'homepageBackground',
  'photo',
  'cover',
  'coverImage',
  'sharingImage',
  'thumbnail',
  'file',
  'ogImage',
  'backdrop',
  'media',
  'backgroundImage',
  'portrait',
  'avatar',
])

function relId(value: unknown): number | string | null {
  if (value == null) return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

function collectMediaIds(value: unknown, out: Set<string | number>) {
  if (value == null) return
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    // Candidate — filtered against media collection later.
    out.add(value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((v) => collectMediaIds(v, out))
    return
  }
  if (typeof value !== 'object') return

  const obj = value as Record<string, unknown>

  if (obj.relationTo === 'media') {
    const id = relId(obj.value)
    if (id != null) out.add(id)
  }

  if (obj.type === 'upload') {
    const id = relId(obj.value)
    if (id != null) out.add(id)
  }

  for (const [key, child] of Object.entries(obj)) {
    if (key === 'sizes' || key === 'id' || key === 'site') continue
    // Skip obvious non-media scalars stored as numbers (order, depth, …)
    if (
      key === 'depth' ||
      key === '_order' ||
      key === 'order' ||
      key === 'loginAttempts' ||
      key.endsWith('At') ||
      key === 'publishedAt' ||
      key === 'startDate' ||
      key === 'endDate'
    ) {
      continue
    }
    if (MEDIA_FIELD_KEYS.has(key) || /image|logo|photo|cover|avatar|portrait|icon|media|file/i.test(key)) {
      const id = relId(child)
      if (id != null) out.add(id)
    }
    collectMediaIds(child, out)
  }
}

function stripMeta(value: unknown): unknown {
  if (value == null) return value
  if (Array.isArray(value)) return value.map(stripMeta)
  if (typeof value !== 'object') return value

  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (STRIP_KEYS.has(k)) continue
    out[k] = stripMeta(v)
  }
  return out
}

type Maps = {
  media: Map<string | number, number>
  docs: Map<string, Map<string | number, number | string>>
  siteId: number
}

function mapDocId(maps: Maps, collection: string, id: string | number | null) {
  if (id == null) return null
  if (collection === 'media') return maps.media.get(id) ?? null
  if (collection === 'sites') return maps.siteId
  return maps.docs.get(collection)?.get(id) ?? null
}

function remapIdsInArray(items: unknown[], collectionHint: string | null, maps: Maps): unknown[] {
  return items.map((item) => {
    const id = relId(item)
    if (id != null && collectionHint) {
      const mapped = mapDocId(maps, collectionHint, id)
      return mapped ?? null
    }
    return remapValue(item, maps)
  })
}

function isFormishBlock(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false
  const o = item as AnyDoc
  const blockType = o.blockType ?? (o.fields as AnyDoc | undefined)?.blockType
  if (blockType === 'form' || blockType === 'formEmbed') return true
  // Lexical block node wrapping a form
  if (o.type === 'block' && (o.fields as AnyDoc | undefined)?.form != null) return true
  return false
}

/** Forms are not site-synced — drop form blocks / form FKs so create validates. */
function stripFormRefs(value: unknown): unknown {
  if (value == null) return value
  if (Array.isArray(value)) {
    return value.filter((item) => !isFormishBlock(item)).map(stripFormRefs)
  }
  if (typeof value !== 'object') return value

  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'form') continue
    out[k] = stripFormRefs(v)
  }
  return out
}

/** Pass-1 create: drop internal refs so docs can insert before siblings exist. */
function stripInternalRefs(value: unknown): unknown {
  if (value == null) return value
  if (Array.isArray(value)) return value.map(stripInternalRefs)
  if (typeof value !== 'object') return value

  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'reference' && obj.linkType === 'internal') {
      out[k] = null
      continue
    }
    if (
      typeof obj.relationTo === 'string' &&
      k === 'value' &&
      SITE_COLLECTIONS.includes(obj.relationTo as never)
    ) {
      out[k] = null
      continue
    }
    out[k] = stripInternalRefs(v)
  }
  return out
}

function remapValue(value: unknown, maps: Maps): unknown {
  if (value == null) return value
  if (Array.isArray(value)) return value.map((v) => remapValue(v, maps))
  if (typeof value !== 'object') return value

  const obj = value as Record<string, unknown>

  if (typeof obj.relationTo === 'string' && 'value' in obj) {
    const collection = obj.relationTo
    const mapped = mapDocId(maps, collection, relId(obj.value))
    return { relationTo: collection, value: mapped }
  }

  if (obj.type === 'upload') {
    const mapped = mapDocId(maps, 'media', relId(obj.value))
    return {
      ...obj,
      relationTo: obj.relationTo ?? 'media',
      value: mapped,
    }
  }

  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'site') {
      out.site = maps.siteId
      continue
    }
    if (MEDIA_FIELD_KEYS.has(k) || /^(images?|logo|photo|cover|coverImage|sharingImage|avatar|portrait|icon|ogImage|file)$/i.test(k)) {
      if (Array.isArray(v)) {
        out[k] = v.map((item) => {
          const id = relId(item)
          return id != null ? mapDocId(maps, 'media', id) : remapValue(item, maps)
        })
        continue
      }
      const id = relId(v)
      if (id != null || v == null) {
        out[k] = id != null ? mapDocId(maps, 'media', id) : null
        continue
      }
    }
    if (k === 'tags' || k === 'topics') {
      out[k] = Array.isArray(v) ? remapIdsInArray(v, 'tags', maps) : remapValue(v, maps)
      continue
    }
    if (k === 'audiences') {
      out[k] = Array.isArray(v)
        ? remapIdsInArray(v, 'workshop-audiences', maps)
        : remapValue(v, maps)
      continue
    }
    // publication-types relationship only — never Lexical node `type: "paragraph"` etc.
    if (k === 'types' || k === 'type') {
      if (Array.isArray(v)) {
        out[k] = remapIdsInArray(v, 'publication-types', maps)
        continue
      }
      if (typeof v === 'number' || (v && typeof v === 'object' && 'id' in v)) {
        out[k] = mapDocId(maps, 'publication-types', relId(v))
        continue
      }
      // string Lexical types ("root", "text", …) — keep as-is
      out[k] = v
      continue
    }
    if (k === 'people' || k === 'speakers' || k === 'lecturers') {
      out[k] = Array.isArray(v) ? remapIdsInArray(v, 'lide', maps) : remapValue(v, maps)
      continue
    }
    if (k === 'workshop') {
      out[k] = mapDocId(maps, 'workshopy', relId(v))
      continue
    }
    if (k === 'project' || k === 'projekt') {
      out[k] = mapDocId(maps, 'projekty', relId(v))
      continue
    }
    out[k] = remapValue(v, maps)
  }
  return out
}

async function fetchAll(
  payload: Payload,
  collection: CollectionSlug,
  where: Record<string, unknown>,
) {
  const docs: AnyDoc[] = []
  let page = 1
  for (;;) {
    const res = await payload.find({
      collection,
      depth: 0,
      draft: true,
      limit: 100,
      overrideAccess: true,
      page,
      where: where as never,
    })
    docs.push(...(res.docs as AnyDoc[]))
    if (!res.hasNextPage) break
    page += 1
  }
  return docs
}

async function downloadMedia(baseUrl: string, filename: string, dest: string) {
  if (existsSync(dest)) return dest
  mkdirSync(dirname(dest), { recursive: true })

  // Prefer files already pulled via scp into cache or local media/
  const localCandidates = [
    join(ROOT, 'media', filename),
    join(CACHE, 'media-scp', filename),
  ]
  for (const src of localCandidates) {
    if (existsSync(src)) {
      const { copyFileSync } = await import('node:fs')
      copyFileSync(src, dest)
      return dest
    }
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/media/file/${encodeURIComponent(filename)}`
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`media download ${filename}: ${res.status}`)
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(dest))
  return dest
}

async function ensureTaxonomy(
  payload: Payload,
  collection: (typeof TAXONOMIES)[number],
  source: AnyDoc,
) {
  const slug = String(source.slug ?? '')
  const title = String(source.title ?? slug)
  if (!slug) return null

  const existing = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: slug } },
  })
  if (existing.docs[0]) return existing.docs[0].id as number

  const created = await payload.create({
    collection,
    data: { slug, title },
    overrideAccess: true,
  })
  return created.id as number
}

async function upsertMedia(
  payload: Payload,
  source: AnyDoc,
  filePath: string,
): Promise<number | null> {
  const filename = String(source.filename ?? '')
  if (!filename || !existsSync(filePath)) return null

  const existing = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { filename: { equals: filename } },
  })
  if (existing.docs[0]) return existing.docs[0].id as number

  const buf = readFileSync(filePath)
  const created = await payload.create({
    collection: 'media',
    data: {
      alt: (source.alt as string) || filename.replace(/\.[^.]+$/, ''),
      ...(source.caption ? { caption: source.caption as string } : {}),
    },
    file: {
      data: buf,
      mimetype: String(source.mimeType || 'application/octet-stream'),
      name: filename,
      size: buf.byteLength,
    },
    overrideAccess: true,
  })
  return created.id as number
}

async function deleteSiteContent(payload: Payload, siteId: number) {
  for (const collection of [...SITE_COLLECTIONS].reverse()) {
    const docs = await fetchAll(payload, collection, { site: { equals: siteId } })
    for (const doc of docs) {
      await payload.delete({
        collection,
        id: doc.id as number,
        overrideAccess: true,
      })
    }
    console.log(`  deleted ${docs.length} ${collection}`)
  }
}

async function runExport(siteSlug: string, outDir: string) {
  mkdirSync(outDir, { recursive: true })
  const payload = await getPayload({ config })

  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    draft: true,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: siteSlug } },
  })
  const site = sites.docs[0] as AnyDoc | undefined
  if (!site) throw new Error(`source site not found: ${siteSlug}`)

  const siteId = site.id as number
  const bundle: {
    siteSlug: string
    site: AnyDoc
    collections: Record<string, AnyDoc[]>
    media: AnyDoc[]
    taxonomies: Record<string, AnyDoc[]>
  } = {
    siteSlug,
    site,
    collections: {},
    media: [],
    taxonomies: {},
  }

  for (const collection of SITE_COLLECTIONS) {
    const docs = await fetchAll(payload, collection, { site: { equals: siteId } })
    bundle.collections[collection] = docs
    console.log(`  export ${collection}: ${docs.length}`)
  }

  const taxIds: Record<string, Set<string | number>> = {
    tags: new Set(),
    'workshop-audiences': new Set(),
    'publication-types': new Set(),
  }

  const walkTax = (value: unknown) => {
    if (value == null) return
    if (Array.isArray(value)) {
      value.forEach(walkTax)
      return
    }
    if (typeof value !== 'object') return
    const obj = value as Record<string, unknown>
    if (typeof obj.relationTo === 'string' && TAXONOMIES.includes(obj.relationTo as never)) {
      const id = relId(obj.value)
      if (id != null) taxIds[obj.relationTo]?.add(id)
    }
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'tags' || k === 'topics' || k === 'audiences' || k === 'types' || k === 'type') {
        const add = (id: string | number | null) => {
          if (id == null) return
          if (k === 'audiences') taxIds['workshop-audiences'].add(id)
          else if (k === 'types' || k === 'type') taxIds['publication-types'].add(id)
          else taxIds.tags.add(id)
        }
        if (Array.isArray(v)) v.forEach((item) => add(relId(item)))
        else add(relId(v))
      }
      walkTax(v)
    }
  }
  walkTax(site)
  for (const docs of Object.values(bundle.collections)) walkTax(docs)

  for (const collection of TAXONOMIES) {
    const docs: AnyDoc[] = []
    for (const id of taxIds[collection]) {
      try {
        docs.push(
          (await payload.findByID({
            collection,
            id,
            depth: 0,
            overrideAccess: true,
          })) as AnyDoc,
        )
      } catch {
        /* missing ok */
      }
    }
    bundle.taxonomies[collection] = docs
    console.log(`  export ${collection}: ${docs.length}`)
  }

  const mediaCandidates = new Set<string | number>()
  collectMediaIds(site, mediaCandidates)
  for (const docs of Object.values(bundle.collections)) collectMediaIds(docs, mediaCandidates)

  for (const id of mediaCandidates) {
    try {
      bundle.media.push(
        (await payload.findByID({
          collection: 'media',
          id,
          depth: 0,
          overrideAccess: true,
        })) as AnyDoc,
      )
    } catch {
      // not a media id — ignore (page/tag ids collide as integers)
    }
  }
  console.log(
    `  export media: ${bundle.media.length} (from ${mediaCandidates.size} numeric candidates)`,
  )

  writeFileSync(join(outDir, 'bundle.json'), JSON.stringify(bundle))
  console.log(`  wrote ${join(outDir, 'bundle.json')}`)
  // Pool can hang process exit — force.
  try {
    await payload.db.destroy?.()
  } catch {
    /* ignore */
  }
}

async function runImport(siteSlug: string, outDir: string, mediaBaseUrl: string) {
  const bundle = JSON.parse(readFileSync(join(outDir, 'bundle.json'), 'utf8')) as {
    siteSlug: string
    site: AnyDoc
    collections: Record<string, AnyDoc[]>
    media: AnyDoc[]
    taxonomies: Record<string, AnyDoc[]>
  }

  if (bundle.siteSlug !== siteSlug) {
    throw new Error(`bundle slug ${bundle.siteSlug} != ${siteSlug}`)
  }

  const payload = await getPayload({ config })

  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    draft: true,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: siteSlug } },
  })
  let localSite = sites.docs[0] as AnyDoc | undefined
  if (!localSite) {
    console.log('  creating local site', siteSlug)
    localSite = (await payload.create({
      collection: 'sites',
      data: {
        name: String(bundle.site.name || siteSlug),
        slug: siteSlug,
        siteType: 'subsite',
        _status: 'published',
      },
      overrideAccess: true,
    })) as AnyDoc
  }

  const localSiteId = localSite.id as number
  console.log(`  local site id=${localSiteId}`)

  // Safety counts for other sites before wipe
  for (const other of ['nazemi', 'nanebi']) {
    const s = await payload.find({
      collection: 'sites',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: other } },
    })
    const sid = s.docs[0]?.id
    if (!sid) continue
    const pages = await payload.find({
      collection: 'stranky',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { site: { equals: sid } },
    })
    console.log(`  safety ${other}: ${pages.totalDocs} stranky (must stay)`)
  }

  console.log('→ wipe local site content (site row kept)')
  await deleteSiteContent(payload, localSiteId)

  const mediaMap = new Map<string | number, number>()
  const mediaDir = join(CACHE, 'media')
  mkdirSync(mediaDir, { recursive: true })

  console.log('→ media')
  for (const src of bundle.media) {
    const filename = String(src.filename ?? '')
    if (!filename) continue
    const dest = join(mediaDir, filename)
    try {
      await downloadMedia(mediaBaseUrl, filename, dest)
      const id = await upsertMedia(payload, src, dest)
      if (id != null) mediaMap.set(src.id as number, id)
      process.stdout.write('.')
    } catch (err) {
      console.warn(`\n  media fail ${filename}:`, err)
    }
  }
  console.log(`\n  media mapped ${mediaMap.size}/${bundle.media.length}`)

  const docMaps = new Map<string, Map<string | number, number | string>>()
  for (const collection of [...TAXONOMIES, ...SITE_COLLECTIONS]) {
    docMaps.set(collection, new Map())
  }

  console.log('→ taxonomies')
  for (const collection of TAXONOMIES) {
    for (const src of bundle.taxonomies[collection] || []) {
      const id = await ensureTaxonomy(payload, collection, src)
      if (id != null) docMaps.get(collection)!.set(src.id as number, id)
    }
  }

  const maps: Maps = { media: mediaMap, docs: docMaps, siteId: localSiteId }

  // workshopy before kalendar (same-site workshop validate). stranky last (menus/CTAs).
  const order: (typeof SITE_COLLECTIONS)[number][] = [
    'prehledy',
    'lide',
    'workshopy',
    'aktuality',
    'publikace',
    'projekty',
    'kalendar',
    'stranky',
  ]

  console.log('→ create docs (pass 1)')
  for (const collection of order) {
    const docs = bundle.collections[collection] || []
    for (const src of docs) {
      const data = stripFormRefs(
        stripInternalRefs(remapValue(stripMeta(src), maps)),
      ) as AnyDoc
      data.site = localSiteId
      delete data.author // users FK — not synced
      // Internal link validation requires a reference — flip to external stub for pass 1.
      const softenLinks = (node: unknown): void => {
        if (node == null || typeof node !== 'object') return
        if (Array.isArray(node)) {
          node.forEach(softenLinks)
          return
        }
        const o = node as Record<string, unknown>
        if (o.linkType === 'internal' && (o.reference == null || o.reference === null)) {
          o.linkType = 'external'
          o.href = typeof o.href === 'string' && o.href.startsWith('/') ? o.href : '/'
          delete o.reference
        }
        for (const v of Object.values(o)) softenLinks(v)
      }
      softenLinks(data)
      const status = src._status === 'draft' ? 'draft' : 'published'
      try {
        const created = await payload.create({
          collection,
          data: { ...data, _status: status } as never,
          draft: status === 'draft',
          overrideAccess: true,
        })
        docMaps.get(collection)!.set(src.id as number, created.id)
      } catch (err) {
        const detail =
          err && typeof err === 'object' && 'data' in err
            ? JSON.stringify((err as { data: unknown }).data)
            : err instanceof Error
              ? err.message
              : String(err)
        console.error(
          `  create skip ${collection} slug=${src.slug ?? src.title ?? src.id}: ${detail}`,
        )
      }
    }
    console.log(
      `  created ${docMaps.get(collection)!.size}/${docs.length} ${collection}`,
    )
  }

  console.log('→ update docs (pass 2, full remap)')
  for (const collection of order) {
    const docs = bundle.collections[collection] || []
    let updated = 0
    for (const src of docs) {
      const localId = docMaps.get(collection)!.get(src.id as number)
      if (localId == null) continue
      const data = stripFormRefs(remapValue(stripMeta(src), maps)) as AnyDoc
      data.site = localSiteId
      delete data.author
      const status = src._status === 'draft' ? 'draft' : 'published'
      try {
        await payload.update({
          collection,
          id: localId,
          data: { ...data, _status: status } as never,
          draft: status === 'draft',
          overrideAccess: true,
        })
        updated++
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err)
        console.error(
          `  update skip ${collection} slug=${src.slug ?? src.title ?? src.id}: ${detail}`,
        )
      }
    }
    console.log(`  updated ${updated}/${docs.length} ${collection}`)
  }

  console.log('→ update site (menus, branding, contact)')
  const siteData = stripFormRefs(remapValue(stripMeta(bundle.site), maps)) as AnyDoc
  delete siteData.siteType
  delete siteData.slug
  // Soften menus/CTAs: forms not synced; null internal refs → external.
  const softenSiteLinks = (node: unknown): void => {
    if (node == null || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(softenSiteLinks)
      return
    }
    const o = node as Record<string, unknown>
    const ref = o.reference as { relationTo?: string; value?: unknown } | null | undefined
    if (o.linkType === 'internal') {
      if (ref?.relationTo === 'forms' || ref == null || ref.value == null) {
        o.linkType = 'external'
        o.href = typeof o.href === 'string' && o.href ? o.href : '/'
        delete o.reference
      }
    }
    for (const v of Object.values(o)) softenSiteLinks(v)
  }
  softenSiteLinks(siteData)
  const siteStatus = bundle.site._status === 'draft' ? 'draft' : 'published'
  try {
    await payload.update({
      collection: 'sites',
      id: localSiteId,
      data: { ...siteData, _status: siteStatus } as never,
      draft: siteStatus === 'draft',
      overrideAccess: true,
    })
    console.log('  site updated')
  } catch (err) {
    console.error(
      `  full site update failed (${err instanceof Error ? err.message : err}); branding+bg+menus soft`,
    )
    const partial: AnyDoc = {
      name: siteData.name,
      logo: siteData.logo,
      logoNavbarPadding: siteData.logoNavbarPadding,
      favicon: siteData.favicon,
      homepageBackground: siteData.homepageBackground,
      primaryColor: siteData.primaryColor,
      primaryBackgroundColor: siteData.primaryBackgroundColor,
      accentColor: siteData.accentColor,
      additionalColors: siteData.additionalColors,
      mainMenu: siteData.mainMenu,
      secondaryMenu: siteData.secondaryMenu,
      footerMenu: siteData.footerMenu,
      donateCta: siteData.donateCta,
      metaTitle: siteData.metaTitle,
      description: siteData.description,
      sharingImage: siteData.sharingImage,
      enabledCollections: siteData.enabledCollections,
      _status: siteStatus,
    }
    await payload.update({
      collection: 'sites',
      id: localSiteId,
      data: partial as never,
      draft: siteStatus === 'draft',
      overrideAccess: true,
    })
    console.log('  site partial updated (homepageBackground + branding + softened menus)')
  }

  // Post-safety
  for (const other of ['nazemi', 'nanebi']) {
    const s = await payload.find({
      collection: 'sites',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: other } },
    })
    const sid = s.docs[0]?.id
    if (!sid) continue
    const pages = await payload.find({
      collection: 'stranky',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { site: { equals: sid } },
    })
    console.log(`  safety ${other}: ${pages.totalDocs} stranky`)
  }

  await payload.db.destroy?.()
}

async function main() {
  const args = process.argv.slice(2)
  const mode = args.includes('--export')
    ? 'export'
    : args.includes('--import')
      ? 'import'
      : 'all'
  const siteSlug = args.find((a) => !a.startsWith('--')) || 'flowmakers'
  const mediaBaseUrl = process.env.MEDIA_BASE_URL || 'https://novy.nazemi.cz'
  const outDir = process.env.SYNC_OUT_DIR || join(CACHE, siteSlug)

  if (mode === 'export') {
    console.log(`→ export ${siteSlug} from ${process.env.DATABASE_URL}`)
    await runExport(siteSlug, outDir)
    process.exit(0)
  }

  if (mode === 'import') {
    console.log(`→ import ${siteSlug} into ${process.env.DATABASE_URL}`)
    await runImport(siteSlug, outDir, mediaBaseUrl)
    process.exit(0)
  }

  const sourceUrl = process.env.SOURCE_DATABASE_URL
  if (!sourceUrl) {
    console.error('SOURCE_DATABASE_URL required (or use --export / --import)')
    process.exit(1)
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL required (local target)')
    process.exit(1)
  }
  if (sourceUrl === process.env.DATABASE_URL) {
    console.error('SOURCE_DATABASE_URL must differ from DATABASE_URL')
    process.exit(1)
  }

  const script = join(__dirname, 'sync-site-from-db.ts')
  const run = (label: string, env: NodeJS.ProcessEnv, args: string[]) => {
    console.log(`→ spawn ${label}`)
    const res = spawnSync('npx', ['tsx', script, ...args], {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    })
    if (res.status !== 0) process.exit(res.status ?? 1)
  }

  run('export from source', { DATABASE_URL: sourceUrl, SYNC_OUT_DIR: outDir }, [
    '--export',
    siteSlug,
  ])
  run(
    'import into local',
    { MEDIA_BASE_URL: mediaBaseUrl, SYNC_OUT_DIR: outDir },
    ['--import', siteSlug],
  )

  console.log('DONE', siteSlug)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

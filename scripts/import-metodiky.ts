/**
 * Import WordPress Metodické materiály WXR → Publikace (main site, type Metodika).
 *
 * Usage:
 *   npm run import:metodiky -- --xml=/path/to/file.xml
 *   npm run import:metodiky -- --xml=… --limit=3
 *   npm run import:metodiky -- --xml=… --dry-run
 */
import 'dotenv/config'

import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '@payload-config'
import { MAIN_SITE_SLUG } from '@/lib/site-context'
import { slugify } from '@/lib/slug'

import {
  assertHeifSupport,
  originalImageUrl,
  uploadAttachment,
  uploadRemoteFile,
  type UploadedAsset,
} from './import-aktuality/assets'
import {
  htmlToLexical,
  isNazemiFileUrl,
  prepareHtml,
  rewriteFileHrefs,
  seoDescription,
} from './import-aktuality/html'
import { authorDisplayName, type WpAttachment } from './import-aktuality/parse-wxr'
import {
  parseMetodikyWxrFile,
  type MetodikyWpPost,
} from './import-metodiky/parse-wxr'

const DEFAULT_XML =
  '/Users/eugenkorda/Library/Containers/com.apple.mail/Data/Library/Mail Downloads/C8A565A6-1B1B-4B12-A244-A50C32C87BDB/nazemi.WordPress.metodicke-materialy.xml'

const REPORT_PATH = path.resolve(process.cwd(), 'scripts/import-metodiky-report.json')

const DOWNLOAD_EXT_RE = /\.(?:pdf|zip|docx?)(?:$|[?#])/i

type Report = {
  created: string[]
  failed: { reason: string; slug: string }[]
  missingAssets: string[]
  multiFile: string[]
  shopOnly: string[]
  singleFile: string[]
  updated: string[]
}

type Downloadable = {
  label: string
  url: string
}

const argValue = (args: string[], name: string) => {
  const hit = args.find((arg) => arg.startsWith(`${name}=`))
  return hit ? hit.slice(name.length + 1) : undefined
}

const normalizeUrl = (url: string) => {
  try {
    const u = new URL(url)
    u.hash = ''
    return u.toString()
  } catch {
    return url.trim()
  }
}

/** WP `Y-m-d H:i:s` → ISO; bad/empty → now. */
const toIsoPublishedAt = (wpDate: string | null | undefined) => {
  if (!wpDate || wpDate.startsWith('1970')) return new Date().toISOString()
  const parsed = new Date(wpDate.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString()
  return parsed.toISOString()
}

const isDownloadUrl = (url: string) => DOWNLOAD_EXT_RE.test(url)

const fileLabel = (att: WpAttachment | undefined, url: string) => {
  const title = att?.title?.trim()
  if (title) return title
  try {
    return decodeURIComponent(path.basename(new URL(url).pathname)) || url
  } catch {
    return url
  }
}

const collectDownloadables = (
  post: MetodikyWpPost,
  attachments: Map<string, WpAttachment>,
  contentFileHrefs: string[],
): Downloadable[] => {
  const byUrl = new Map<string, Downloadable>()

  for (const att of attachments.values()) {
    if (att.parent !== post.id) continue
    if (!isDownloadUrl(att.url)) continue
    byUrl.set(normalizeUrl(att.url), { label: fileLabel(att, att.url), url: att.url })
  }

  if (post.buttonUrl && isNazemiFileUrl(post.buttonUrl) && isDownloadUrl(post.buttonUrl)) {
    const key = normalizeUrl(post.buttonUrl)
    if (!byUrl.has(key)) {
      const match = [...attachments.values()].find(
        (att) => normalizeUrl(att.url) === key || att.url === post.buttonUrl,
      )
      byUrl.set(key, { label: fileLabel(match, post.buttonUrl), url: post.buttonUrl })
    }
  }

  for (const href of contentFileHrefs) {
    if (!isDownloadUrl(href)) continue
    const key = normalizeUrl(href)
    if (byUrl.has(key)) continue
    const match = [...attachments.values()].find(
      (att) => normalizeUrl(att.url) === key || att.url === href,
    )
    byUrl.set(key, { label: fileLabel(match, href), url: href })
  }

  return [...byUrl.values()]
}

const isShopButton = (post: MetodikyWpPost) => {
  const url = post.buttonUrl?.trim()
  if (!url) return false
  if (isNazemiFileUrl(url) && isDownloadUrl(url)) return false
  if (!/^https?:/i.test(url)) return false
  return Boolean(post.buttonText?.trim() || url)
}

const blockId = () => randomBytes(12).toString('hex')

const emptyLexical = () => ({
  root: {
    type: 'root',
    children: [] as Record<string, unknown>[],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

const callToActionBlock = (
  actions: { href: string; label: string }[],
): Record<string, unknown> => ({
  type: 'block',
  format: '',
  version: 2,
  fields: {
    id: blockId(),
    blockName: '',
    blockType: 'callToAction',
    title: 'Ke stažení',
    actions: actions.map((action) => ({
      id: blockId(),
      label: action.label,
      linkType: 'external',
      href: action.href,
      variant: 'outline',
    })),
  },
})

const appendLexicalBlock = (
  doc: { root?: { children?: unknown[] } } | null,
  block: Record<string, unknown>,
) => {
  const base = doc?.root ? doc : emptyLexical()
  const root = base.root as { children?: unknown[] }
  if (!root.children) root.children = []
  root.children.push(block)
  return base
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const xmlPath = argValue(args, '--xml') || DEFAULT_XML
  const limitRaw = argValue(args, '--limit')
  const limit = limitRaw ? Number(limitRaw) : null

  console.log(`Parsing ${xmlPath}`)
  const dump = parseMetodikyWxrFile(xmlPath)
  console.log(
    `OK ${dump.posts.length} posts, ${dump.attachments.size} attachments, ${dump.authors.size} authors`,
  )

  let selected = dump.posts
  if (limit != null && Number.isFinite(limit) && limit > 0) {
    selected = selected.slice(0, limit)
  }
  console.log(`Importing ${selected.length} post(s)${dryRun ? ' (dry-run)' : ''}`)

  if (dryRun) {
    for (const post of selected) {
      const prepared = prepareHtml({
        attachments: dump.attachments,
        content: post.content,
        slugs: new Set(),
        thumbnailId: post.thumbnailId,
      })
      const downloads = collectDownloadables(
        post,
        dump.attachments,
        prepared.nazemiFileHrefs.filter(isDownloadUrl),
      )
      console.log(
        `  ${post.status.padEnd(8)} ${post.slug}: files=${downloads.length} shop=${isShopButton(post)} thumb=${Boolean(post.thumbnailId)}`,
      )
    }
    return
  }

  assertHeifSupport()
  const payload = await getPayload({ config })

  const siteRes = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: { slug: { equals: MAIN_SITE_SLUG } },
  })
  const siteId = siteRes.docs[0]?.id
  if (!siteId) throw new Error(`Site ${MAIN_SITE_SLUG} missing. Seed/create it first.`)

  // Ensure publication-type Metodika
  let metodikaTypeId: number | string
  {
    const existing = await payload.find({
      collection: 'publication-types',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: { slug: { equals: 'metodika' } },
    })
    if (existing.docs[0]) {
      metodikaTypeId = existing.docs[0].id
    } else {
      const created = await payload.create({
        collection: 'publication-types',
        data: { slug: 'metodika', title: 'Metodika' },
        overrideAccess: true,
      })
      metodikaTypeId = created.id
    }
  }

  const mediaCache = new Map<string, UploadedAsset | null>()
  const attByUrl = new Map<string, string>()
  for (const att of dump.attachments.values()) {
    if (att.url) {
      attByUrl.set(att.url, att.id)
      attByUrl.set(originalImageUrl(att.url), att.id)
      attByUrl.set(normalizeUrl(att.url), att.id)
    }
  }

  const getAttachment = async (id: string, caption?: string) => {
    const cacheKey = `att:${id}`
    if (mediaCache.has(cacheKey)) return mediaCache.get(cacheKey) ?? null
    const att = dump.attachments.get(id)
    if (!att) {
      mediaCache.set(cacheKey, null)
      return null
    }
    const uploaded = await uploadAttachment({ attachment: att, caption, payload })
    mediaCache.set(cacheKey, uploaded)
    return uploaded
  }

  const getUrl = async (url: string, alt?: string, caption?: string) => {
    const attId =
      attByUrl.get(url) || attByUrl.get(originalImageUrl(url)) || attByUrl.get(normalizeUrl(url))
    if (attId) return getAttachment(attId, caption)
    const cacheKey = `url:${url}`
    if (mediaCache.has(cacheKey)) return mediaCache.get(cacheKey) ?? null
    const uploaded = await uploadRemoteFile({ alt, caption, payload, url })
    mediaCache.set(cacheKey, uploaded)
    return uploaded
  }

  const report: Report = {
    created: [],
    failed: [],
    missingAssets: [],
    multiFile: [],
    shopOnly: [],
    singleFile: [],
    updated: [],
  }

  let index = 0
  for (const post of selected) {
    index += 1
    // Empty WP slug (drafts) → include post id so we never collide with a published twin.
    const slug = (
      post.slug?.trim() ||
      `${slugify(post.title) || 'metodika'}-${post.id}`
    ).trim()
    console.log(`[${index}/${selected.length}] ${slug}`)
    try {
      const prepared = prepareHtml({
        attachments: dump.attachments,
        content: post.content || '<p></p>',
        slugs: new Set(),
        thumbnailId: post.thumbnailId,
      })
      let html = prepared.html

      const downloads = collectDownloadables(
        post,
        dump.attachments,
        prepared.nazemiFileHrefs.filter(isDownloadUrl),
      )

      const mediaByToken = new Map<string, { asset: UploadedAsset; maxWidth: number | null }>()
      for (const [token, ref] of prepared.markers) {
        const uploaded =
          ref.kind === 'attachment'
            ? await getAttachment(ref.attachmentId, ref.caption)
            : await getUrl(ref.url, ref.alt, ref.caption)
        if (!uploaded) {
          report.missingAssets.push(`${slug} ${token}`)
          continue
        }
        mediaByToken.set(token, { asset: uploaded, maxWidth: ref.maxWidth })
      }

      // Upload all downloadables + any other nazemi file hrefs for rewrite
      const urlToMediaUrl = new Map<string, string>()
      const downloadMedia: { href: string; label: string; mediaUrl: string }[] = []

      for (const dl of downloads) {
        const uploaded = await getUrl(dl.url, dl.label)
        if (!uploaded?.url) {
          report.missingAssets.push(`${slug} file ${dl.url}`)
          continue
        }
        urlToMediaUrl.set(dl.url, uploaded.url)
        urlToMediaUrl.set(normalizeUrl(dl.url), uploaded.url)
        downloadMedia.push({ href: uploaded.url, label: dl.label, mediaUrl: uploaded.url })
      }

      for (const href of new Set(prepared.nazemiFileHrefs)) {
        if (urlToMediaUrl.has(href) || urlToMediaUrl.has(normalizeUrl(href))) continue
        const uploaded = await getUrl(href)
        if (!uploaded?.url) {
          report.missingAssets.push(`${slug} file ${href}`)
          continue
        }
        urlToMediaUrl.set(href, uploaded.url)
      }

      html = rewriteFileHrefs(html, urlToMediaUrl)

      let content = await htmlToLexical(html, payload, (token) => {
        const hit = mediaByToken.get(token)
        if (!hit) return null
        return { id: hit.asset.id, maxWidth: hit.maxWidth }
      })

      const shop = isShopButton(post)
      const ctas: {
        href: string
        linkType: 'external'
        title: string
      }[] = []

      if (downloadMedia.length === 1) {
        ctas.push({
          title: 'Stáhnout metodiku',
          linkType: 'external',
          href: downloadMedia[0].mediaUrl,
        })
        report.singleFile.push(slug)
      } else if (downloadMedia.length >= 2) {
        content = appendLexicalBlock(
          content,
          callToActionBlock(
            downloadMedia.map((d) => ({ href: d.mediaUrl, label: d.label })),
          ),
        )
        report.multiFile.push(slug)
      } else if (shop) {
        report.shopOnly.push(slug)
      }

      if (shop) {
        ctas.push({
          title: post.buttonText.trim() || 'Odkaz',
          linkType: 'external',
          href: post.buttonUrl.trim(),
        })
      }

      if (!content) content = emptyLexical()

      let cover: UploadedAsset | null = null
      if (post.thumbnailId) cover = await getAttachment(post.thumbnailId)
      if (!cover?.id) {
        report.failed.push({ reason: 'missing cover image', slug })
        continue
      }

      const existing = await payload.find({
        collection: 'publikace',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        pagination: false,
        where: {
          and: [{ slug: { equals: slug } }, { site: { equals: siteId } }],
        },
      })

      const published = post.status === 'publish'
      const data = {
        _status: published ? ('published' as const) : ('draft' as const),
        authorName: authorDisplayName(dump.authors, post.authorLogin) || null,
        content,
        coverImage: cover.id,
        ctas,
        description: seoDescription({ ...post, content: post.content }),
        excerpt: null,
        publishedAt: toIsoPublishedAt(post.date),
        site: siteId,
        slug,
        title: post.title || slug,
        topics: [],
        types: [metodikaTypeId],
      }

      if (existing.docs[0]) {
        await payload.update({
          id: existing.docs[0].id,
          collection: 'publikace',
          data: data as never,
          draft: !published,
          overrideAccess: true,
        })
        report.updated.push(slug)
      } else {
        await payload.create({
          collection: 'publikace',
          data: data as never,
          draft: !published,
          overrideAccess: true,
        })
        report.created.push(slug)
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      report.failed.push({ reason, slug })
      console.error(`FAIL ${slug}: ${reason}`)
    }
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
  console.log(`Report ${REPORT_PATH}`)
  console.log({
    created: report.created.length,
    failed: report.failed.length,
    missingAssets: report.missingAssets.length,
    multiFile: report.multiFile.length,
    shopOnly: report.shopOnly.length,
    singleFile: report.singleFile.length,
    updated: report.updated.length,
  })
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

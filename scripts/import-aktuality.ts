import 'dotenv/config'

import fs from 'node:fs'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '@payload-config'
import { MAIN_SITE_SLUG } from '@/lib/site-context'
import { slugify } from '@/lib/slug'

import {
  assertHeifSupport,
  coverLayout,
  originalImageUrl,
  uploadAttachment,
  uploadRemoteFile,
  type UploadedAsset,
} from './import-aktuality/assets'
import {
  appendButton,
  htmlToLexical,
  isNazemiFileUrl,
  prepareHtml,
  rewriteFileHrefs,
  scrapeArticleHtml,
  seoDescription,
} from './import-aktuality/html'
import {
  DEFAULT_EXPORT_DIR,
  assertPublishedAktualityCount,
  authorDisplayName,
  parseWxrDir,
  type WpPost,
} from './import-aktuality/parse-wxr'

const SAMPLE_SLUGS = [
  'oslavujeme-20-let-nazemi',
  'letni-skola-kriticke-pedagogiky',
  'koncime-s-fair-trade-ale-na-globalni-spravedlnosti-nam-zalezi',
  'nerustovy-newsletter-ii-23',
  'oneearthreport',
  'jak-na-odolnost-a-prosperitu-v-ceskych-obcich-vikendovy-seminar-v-jablonci-nad-nisou',
  'prihlasovani-na-metodicky-kurz-kriticke-mysleni-v-globalnich-tematech-80-hod',
  'klimadisent-klimaticka-krize-skoncila-klimaticke-vzdelavani-zustava',
  'manifest',
]

const REPORT_PATH = path.resolve(process.cwd(), 'scripts/import-aktuality-report.json')

type Report = {
  created: string[]
  epochDates: { fallback: string; slug: string; source: string }[]
  failed: { reason: string; slug: string }[]
  layouts: { big: number; small: number }
  missingAssets: string[]
  scrapedContent: string[]
  thirdPartyFiles: string[]
  updated: string[]
}

const argValue = (args: string[], name: string) => {
  const hit = args.find((arg) => arg.startsWith(`${name}=`))
  return hit ? hit.slice(name.length + 1) : undefined
}

const pickPosts = (posts: WpPost[], limit: number | null) => {
  if (limit == null) return posts
  const bySlug = new Map(posts.map((post) => [post.slug, post]))
  const picked: WpPost[] = []
  for (const slug of SAMPLE_SLUGS) {
    const post = bySlug.get(slug)
    if (post) picked.push(post)
    if (picked.length >= limit) return picked
  }
  for (const post of [...posts].reverse()) {
    if (picked.some((item) => item.id === post.id)) continue
    picked.push(post)
    if (picked.length >= limit) break
  }
  return picked
}

const scrapePublishedAt = async (slug: string) => {
  try {
    const res = await fetch(`https://nazemi.cz/${slug}/`, {
      headers: { 'user-agent': 'nazemi-aktuality-import/1.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const jsonLd = /"datePublished"\s*:\s*"([^"]+)"/.exec(html)?.[1]
    if (jsonLd && !jsonLd.startsWith('1970')) return jsonLd
    const time = /<time[^>]*datetime="([^"]+)"/.exec(html)?.[1]
    if (time && !time.startsWith('1970')) return time
    return null
  } catch {
    return null
  }
}

const toIso = (wpDate: string) => {
  const normalized = wpDate.replace(' ', 'T')
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString()
  return parsed.toISOString()
}

const resolvePublishedAt = async (post: WpPost, report: Report) => {
  if (!post.date.startsWith('1970')) return toIso(post.date)
  const scraped = await scrapePublishedAt(post.slug)
  if (scraped) {
    report.epochDates.push({ fallback: scraped, slug: post.slug, source: 'live' })
    return toIso(scraped.replace('T', ' ').slice(0, 19))
  }
  report.epochDates.push({ fallback: post.modified, slug: post.slug, source: 'modified' })
  return toIso(post.modified)
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const dir = argValue(args, '--dir') || DEFAULT_EXPORT_DIR
  const limitRaw = argValue(args, '--limit')
  const limit = limitRaw ? Number(limitRaw) : null
  const pdfDir = path.join(dir, 'pdf')

  if (!fs.existsSync(dir)) {
    throw new Error(`Export dir missing: ${dir}`)
  }

  console.log(`Parsing WXR in ${dir}`)
  const dump = parseWxrDir(dir)
  assertPublishedAktualityCount(dump.posts.length)
  console.log(
    `OK ${dump.posts.length} published Aktuality, ${dump.attachments.size} attachments, ${dump.authors.size} authors`,
  )

  const slugs = new Set(dump.posts.map((post) => post.slug).filter(Boolean))
  const selected = pickPosts(dump.posts, limit)
  console.log(`Importing ${selected.length} post(s)${dryRun ? ' (dry-run)' : ''}`)

  if (dryRun) {
    const withImg = selected.filter((post) => /<img|\[gallery|\[caption/i.test(post.content)).length
    const withPdf = selected.filter((post) => /\.pdf/i.test(post.content)).length
    const gallery = dump.posts.find((post) => post.slug === 'oslavujeme-20-let-nazemi')
    if (gallery) {
      const prepared = prepareHtml({
        attachments: dump.attachments,
        content: gallery.content,
        slugs,
        thumbnailId: gallery.thumbnailId,
      })
      if (prepared.markers.size < 8) {
        throw new Error(`[gallery] expand failed: ${prepared.markers.size} markers (need 8+)`)
      }
      console.log(`gallery markers ${prepared.markers.size}`)
    }
    for (const post of selected) {
      let content = post.content
      if (!content.trim()) {
        content = (await scrapeArticleHtml(post.slug)) || ''
        console.log(`  ${post.slug}: EMPTY wxr → scraped ${content.length} chars`)
      }
      const prepared = prepareHtml({
        attachments: dump.attachments,
        content,
        slugs,
        thumbnailId: post.thumbnailId,
      })
      const widths = [...prepared.markers.values()].filter((m) => m.maxWidth != null).length
      console.log(
        `  ${post.slug}: markers=${prepared.markers.size} widths=${widths} files=${prepared.nazemiFileHrefs.length} 3rd=${prepared.thirdPartyFileHrefs.length} html=${prepared.html.length} ps=${(prepared.html.match(/<p[\s>]/g) || []).length}`,
      )
    }
    console.log({ attachments: dump.attachments.size, posts: dump.posts.length, selected: selected.length, withImg, withPdf })
    console.log(
      selected.map((post) => `${post.date.slice(0, 10)} ${post.slug}`).join('\n'),
    )
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

  const tagIds = new Map<string, number | string>()
  const ensureTag = async (slug: string, title: string) => {
    const key = slug || slugify(title)
    if (!key) return null
    const cached = tagIds.get(key)
    if (cached) return cached
    const existing = await payload.find({
      collection: 'tags',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: { slug: { equals: key } },
    })
    if (existing.docs[0]) {
      tagIds.set(key, existing.docs[0].id)
      return existing.docs[0].id
    }
    const created = await payload.create({
      collection: 'tags',
      data: { slug: key, title: title || key },
      overrideAccess: true,
    })
    tagIds.set(key, created.id)
    return created.id
  }

  const mediaCache = new Map<string, UploadedAsset | null>()
  const attByUrl = new Map<string, string>()
  for (const att of dump.attachments.values()) {
    if (att.url) {
      attByUrl.set(att.url, att.id)
      attByUrl.set(originalImageUrl(att.url), att.id)
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
    const uploaded = await uploadAttachment({ attachment: att, caption, payload, pdfDir })
    mediaCache.set(cacheKey, uploaded)
    return uploaded
  }

  const getUrl = async (url: string, alt?: string, caption?: string) => {
    const attId = attByUrl.get(url) || attByUrl.get(originalImageUrl(url))
    if (attId) return getAttachment(attId, caption)
    const cacheKey = `url:${url}`
    if (mediaCache.has(cacheKey)) return mediaCache.get(cacheKey) ?? null
    const uploaded = await uploadRemoteFile({ alt, caption, payload, pdfDir, url })
    mediaCache.set(cacheKey, uploaded)
    return uploaded
  }

  const report: Report = {
    created: [],
    epochDates: [],
    failed: [],
    layouts: { big: 0, small: 0 },
    missingAssets: [],
    scrapedContent: [],
    thirdPartyFiles: [],
    updated: [],
  }

  let index = 0
  for (const post of selected) {
    index += 1
    const slug = post.slug || slugify(post.title)
    console.log(`[${index}/${selected.length}] ${slug}`)
    try {
      let rawContent = post.content
      if (!rawContent.trim()) {
        const scraped = await scrapeArticleHtml(slug)
        if (!scraped) {
          report.failed.push({ reason: 'empty content (WXR + live scrape failed)', slug })
          continue
        }
        rawContent = scraped
        report.scrapedContent.push(slug)
        console.log(`  scraped live HTML (${scraped.length} chars)`)
      }

      const prepared = prepareHtml({
        attachments: dump.attachments,
        content: rawContent,
        slugs,
        thumbnailId: post.thumbnailId,
      })
      let html = prepared.html
      if (post.buttonText && post.buttonUrl) {
        html = appendButton(html, post.buttonText, post.buttonUrl)
        if (isNazemiFileUrl(post.buttonUrl)) prepared.nazemiFileHrefs.push(post.buttonUrl)
      }

      const mediaByToken = new Map<
        string,
        { asset: UploadedAsset; maxWidth: number | null }
      >()
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

      report.thirdPartyFiles.push(...prepared.thirdPartyFileHrefs)

      const urlToMediaUrl = new Map<string, string>()
      for (const href of new Set(prepared.nazemiFileHrefs)) {
        const uploaded = await getUrl(href)
        if (!uploaded?.url) {
          report.missingAssets.push(`${slug} file ${href}`)
          continue
        }
        urlToMediaUrl.set(href, uploaded.url)
      }
      html = rewriteFileHrefs(html, urlToMediaUrl)

      const content = await htmlToLexical(html, payload, (token) => {
        const hit = mediaByToken.get(token)
        if (!hit) return null
        return { id: hit.asset.id, maxWidth: hit.maxWidth }
      })
      if (!content) {
        report.failed.push({ reason: 'empty lexical content', slug })
        continue
      }

      let cover: UploadedAsset | null = null
      if (post.thumbnailId) cover = await getAttachment(post.thumbnailId)
      const width = cover?.width ?? dump.attachments.get(post.thumbnailId)?.width ?? null
      const height = cover?.height ?? dump.attachments.get(post.thumbnailId)?.height ?? null
      const layout = cover ? coverLayout(width, height) : 'small'
      report.layouts[layout] += 1

      const tagIdList: (number | string)[] = []
      for (const tag of post.tags) {
        const id = await ensureTag(tag.nicename, tag.text)
        if (id) tagIdList.push(id)
      }
      for (const cat of post.extraCategories) {
        const id = await ensureTag(cat.nicename, cat.text)
        if (id) tagIdList.push(id)
      }

      const existing = await payload.find({
        collection: 'aktuality',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        pagination: false,
        where: {
          and: [{ slug: { equals: slug } }, { site: { equals: siteId } }],
        },
      })

      const data = {
        _status: 'published' as const,
        authorName: authorDisplayName(dump.authors, post.authorLogin) || null,
        canonicalURL: null,
        content,
        coverImage: cover?.id ?? null,
        description: seoDescription({ ...post, content: rawContent }),
        externalUrl: null,
        layout,
        publishedAt: await resolvePublishedAt(post, report),
        site: siteId,
        slug,
        tags: tagIdList,
        title: post.title || slug,
      }

      if (existing.docs[0]) {
        await payload.update({
          id: existing.docs[0].id,
          collection: 'aktuality',
          data: data as never,
          draft: false,
          overrideAccess: true,
        })
        report.updated.push(slug)
      } else {
        await payload.create({
          collection: 'aktuality',
          data: data as never,
          draft: false,
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

  report.thirdPartyFiles = [...new Set(report.thirdPartyFiles)]
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
  console.log(`Report ${REPORT_PATH}`)
  console.log({
    created: report.created.length,
    failed: report.failed.length,
    layouts: report.layouts,
    missingAssets: report.missingAssets.length,
    scrapedContent: report.scrapedContent.length,
    updated: report.updated.length,
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

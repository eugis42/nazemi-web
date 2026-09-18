import fs from 'node:fs'
import path from 'node:path'

import { JSDOM } from 'jsdom'

/** Locked to the Aug 2026 WXR dump — fail loudly if the export set changes. */
export const EXPECTED_PUBLISHED_AKTUALITY = 456

export const DEFAULT_EXPORT_DIR =
  '/Volumes/T7 Shield/Freelance/NaZemi Rebranding/Web/Old Web Exports'

export type WpAuthor = {
  display: string
  first: string
  last: string
  login: string
}

export type WpTerm = {
  nicename: string
  text: string
}

export type WpAttachment = {
  alt: string
  file: string
  height: number | null
  id: string
  parent: string
  title: string
  url: string
  width: number | null
}

export type WpPost = {
  authorLogin: string
  buttonText: string
  buttonUrl: string
  categories: WpTerm[]
  content: string
  date: string
  excerpt: string
  extraCategories: WpTerm[]
  id: string
  modified: string
  slug: string
  tags: WpTerm[]
  thumbnailId: string
  title: string
  yoastDesc: string
}

export type WpDump = {
  attachments: Map<string, WpAttachment>
  authors: Map<string, WpAuthor>
  posts: WpPost[]
}

const text = (el: Element | null | undefined) => (el?.textContent || '').trim()

const child = (parent: Element, tag: string) => parent.getElementsByTagName(tag)[0] ?? null

const parseWpSize = (meta: string) => {
  const width = /s:5:"width";i:(\d+)/.exec(meta)
  const height = /s:6:"height";i:(\d+)/.exec(meta)
  if (!width || !height) return { height: null, width: null }
  return { height: Number(height[1]), width: Number(width[1]) }
}

const metaMap = (item: Element) => {
  const out: Record<string, string> = {}
  for (const meta of item.getElementsByTagName('wp:postmeta')) {
    const key = text(child(meta, 'wp:meta_key'))
    if (key) out[key] = text(child(meta, 'wp:meta_value'))
  }
  return out
}

const listXmlFiles = (dir: string) =>
  fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.xml') && !name.startsWith('._') && !name.startsWith('.'))
    .map((name) => path.join(dir, name))
    .sort()

const parseAuthors = (document: Document, authors: Map<string, WpAuthor>) => {
  for (const node of document.getElementsByTagName('wp:author')) {
    const login = text(child(node, 'wp:author_login'))
    if (!login) continue
    authors.set(login, {
      display: text(child(node, 'wp:author_display_name')),
      first: text(child(node, 'wp:author_first_name')),
      last: text(child(node, 'wp:author_last_name')),
      login,
    })
  }
}

const parseItem = (
  item: Element,
  attachments: Map<string, WpAttachment>,
  postsById: Map<string, WpPost>,
) => {
  const postType = text(child(item, 'wp:post_type'))
  const id = text(child(item, 'wp:post_id'))
  if (!id) return

  if (postType === 'attachment') {
    const meta = metaMap(item)
    const size = parseWpSize(meta._wp_attachment_metadata || '')
    attachments.set(id, {
      alt: meta._wp_attachment_image_alt || '',
      file: meta._wp_attached_file || '',
      height: size.height,
      id,
      parent: text(child(item, 'wp:post_parent')),
      title: text(child(item, 'title')),
      url: text(child(item, 'wp:attachment_url')) || text(child(item, 'guid')),
      width: size.width,
    })
    return
  }

  if (postType !== 'post') return
  if (text(child(item, 'wp:status')) !== 'publish') return

  const categories: WpTerm[] = []
  const tags: WpTerm[] = []
  for (const cat of item.getElementsByTagName('category')) {
    const domain = cat.getAttribute('domain') || ''
    const term: WpTerm = {
      nicename: cat.getAttribute('nicename') || '',
      text: text(cat),
    }
    if (domain === 'category') categories.push(term)
    else if (domain === 'post_tag') tags.push(term)
  }
  if (!categories.some((cat) => cat.nicename === 'aktuality')) return

  const meta = metaMap(item)
  const extraCategories = categories.filter((cat) => cat.nicename !== 'aktuality')
  postsById.set(id, {
    authorLogin: text(child(item, 'dc:creator')),
    buttonText: meta.text_tlacitka || '',
    buttonUrl: meta.odkaz_tlacitka || '',
    categories,
    content: text(child(item, 'content:encoded')),
    date: text(child(item, 'wp:post_date')),
    excerpt: text(child(item, 'excerpt:encoded')),
    extraCategories,
    id,
    modified: text(child(item, 'wp:post_modified')),
    slug: text(child(item, 'wp:post_name')),
    tags,
    thumbnailId: meta._thumbnail_id || '',
    title: text(child(item, 'title')),
    yoastDesc: meta._yoast_wpseo_metadesc || '',
  })
}

export const parseWxrDir = (dir: string): WpDump => {
  const authors = new Map<string, WpAuthor>()
  const attachments = new Map<string, WpAttachment>()
  const postsById = new Map<string, WpPost>()

  for (const file of listXmlFiles(dir)) {
    const xml = fs.readFileSync(file, 'utf8')
    const dom = new JSDOM(xml, { contentType: 'text/xml' })
    parseAuthors(dom.window.document, authors)
    for (const item of dom.window.document.getElementsByTagName('item')) {
      parseItem(item, attachments, postsById)
    }
  }

  const posts = [...postsById.values()].sort((a, b) => a.date.localeCompare(b.date))
  return { attachments, authors, posts }
}

export const assertPublishedAktualityCount = (count: number) => {
  if (count !== EXPECTED_PUBLISHED_AKTUALITY) {
    throw new Error(
      `WXR published Aktuality count ${count} != ${EXPECTED_PUBLISHED_AKTUALITY}. Dump changed?`,
    )
  }
}

export const authorDisplayName = (authors: Map<string, WpAuthor>, login: string) => {
  const author = authors.get(login)
  if (!author) return ''
  const named = [author.first, author.last].filter(Boolean).join(' ')
  if (named) return named
  if (author.display && author.display !== login) return author.display
  return ''
}

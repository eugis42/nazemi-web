import fs from 'node:fs'

import { JSDOM } from 'jsdom'

import type { WpAttachment, WpAuthor, WpPost, WpTerm } from '../import-aktuality/parse-wxr'

export type MetodikyWpPost = WpPost & {
  status: 'publish' | 'draft' | 'private' | string
}

export type MetodikyDump = {
  attachments: Map<string, WpAttachment>
  authors: Map<string, WpAuthor>
  posts: MetodikyWpPost[]
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

/**
 * Single-file WXR for metodické materiály — keep publish + draft + private posts.
 * Does not filter by Aktuality category (unlike import-aktuality parse).
 */
export const parseMetodikyWxrFile = (xmlPath: string): MetodikyDump => {
  if (!fs.existsSync(xmlPath)) {
    throw new Error(`WXR missing: ${xmlPath}`)
  }

  const authors = new Map<string, WpAuthor>()
  const attachments = new Map<string, WpAttachment>()
  const postsById = new Map<string, MetodikyWpPost>()

  const xml = fs.readFileSync(xmlPath, 'utf8')
  const dom = new JSDOM(xml, { contentType: 'text/xml' })
  parseAuthors(dom.window.document, authors)

  for (const item of dom.window.document.getElementsByTagName('item')) {
    const postType = text(child(item, 'wp:post_type'))
    const id = text(child(item, 'wp:post_id'))
    if (!id) continue

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
      continue
    }

    if (postType !== 'post') continue

    const status = text(child(item, 'wp:status')) || 'draft'
    if (!['publish', 'draft', 'private'].includes(status)) continue

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

    const meta = metaMap(item)
    postsById.set(id, {
      authorLogin: text(child(item, 'dc:creator')),
      buttonText: meta.text_tlacitka || '',
      buttonUrl: meta.odkaz_tlacitka || '',
      categories,
      content: text(child(item, 'content:encoded')),
      date: text(child(item, 'wp:post_date')),
      excerpt: text(child(item, 'excerpt:encoded')),
      extraCategories: categories,
      id,
      modified: text(child(item, 'wp:post_modified')),
      slug: text(child(item, 'wp:post_name')),
      status,
      tags,
      thumbnailId: meta._thumbnail_id || '',
      title: text(child(item, 'title')),
      yoastDesc: meta._yoast_wpseo_metadesc || '',
    })
  }

  const posts = [...postsById.values()].sort((a, b) => a.date.localeCompare(b.date))
  return { attachments, authors, posts }
}

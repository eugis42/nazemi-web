import { createHash } from 'node:crypto'
import path from 'node:path'

import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import type { Payload } from 'payload'

import { excerptFromHtml } from '@/seed/html'

import { originalImageUrl } from './assets'
import type { WpAttachment } from './parse-wxr'

export type MediaRef = {
  alt: string
  caption: string
  /** WP `width` attr — Lexical upload `fields.maxWidth`. */
  maxWidth: number | null
} & (
  | { attachmentId: string; kind: 'attachment' }
  | { kind: 'url'; url: string }
)

export type UploadResolve = {
  id: number | string
  maxWidth: number | null
}

type LexNode = {
  children?: LexNode[]
  text?: string
  type?: string
  [key: string]: unknown
}

const NAZEMI_HOSTS = new Set([
  'archiv.nazemi.cz',
  'nazemi.cz',
  'www.archiv.nazemi.cz',
  'www.nazemi.cz',
])

const FILE_EXT_RE = /\.(?:pdf|zip|docx?|jpe?g|png|gif|webp|heic|heif)(?:$|[?#])/i
const BLOCK_TAG_RE = /<(p|h[1-6]|ul|ol|div|blockquote|table|figure)\b/i

let editorConfigPromise: Promise<Awaited<ReturnType<typeof editorConfigFactory.default>>> | null =
  null

const getEditorConfig = (payload: Payload) => {
  if (!editorConfigPromise) {
    editorConfigPromise = editorConfigFactory.default({ config: payload.config })
  }
  return editorConfigPromise
}

const hashUrl = (url: string) => createHash('sha1').update(url).digest('hex').slice(0, 12)

export const isNazemiHost = (href: string) => {
  try {
    const host = new URL(href).hostname.toLowerCase()
    return NAZEMI_HOSTS.has(host)
  } catch {
    return false
  }
}

export const isNazemiFileUrl = (href: string) => {
  if (/storage\.googleapis\.com\/nazemi/i.test(href)) return true
  if (!isNazemiHost(href)) return false
  if (/\/wp-content\/uploads\//i.test(href)) return true
  if (/\/sites\/default\/files\//i.test(href)) return true
  if (/\/sdc_download\//i.test(href)) return true
  return FILE_EXT_RE.test(href)
}

export const isThirdPartyUrl = (href: string) => {
  if (!/^https?:/i.test(href)) return false
  if (/storage\.googleapis\.com\/nazemi/i.test(href)) return false
  return !isNazemiHost(href)
}

/**
 * Many WP posts use bare `\n\n` paragraphs (no `<p>`). convertHTMLToLexical
 * collapses those into one block — wrap them first.
 */
export const paragraphizeLooseHtml = (html: string) => {
  const trimmed = html.replace(/\r\n/g, '\n').trim()
  if (!trimmed || BLOCK_TAG_RE.test(trimmed)) return trimmed
  return trimmed
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${chunk.replace(/\n/g, '<br />')}</p>`)
    .join('\n')
}

const BLOCK_PARENT_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DIV',
  'DL',
  'FIELDSET',
  'FIGURE',
  'FOOTER',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'UL',
])

/**
 * Wrap consecutive text/inline nodes into `<p>` when mixed with headings/lists
 * (e.g. Manifest: prose between `<h4>` with no `<p>`).
 */
const wrapOrphanInlines = (parent: Element, document: Document) => {
  const children = [...parent.childNodes]
  let run: ChildNode[] = []

  const flush = (before: ChildNode | null) => {
    const meaningful = run.some(
      (node) =>
        (node.nodeType === 1 && (node as Element).tagName !== 'BR') ||
        (node.nodeType === 3 && Boolean(node.textContent?.trim())),
    )
    if (!meaningful) {
      run = []
      return
    }
    const p = document.createElement('p')
    for (const node of run) p.append(node)
    parent.insertBefore(p, before)
    run = []
  }

  for (const child of children) {
    const isBlock =
      child.nodeType === 1 && BLOCK_PARENT_TAGS.has((child as Element).tagName)
    if (isBlock) {
      flush(child)
      const el = child as Element
      if (el.tagName === 'DIV' || el.tagName === 'SECTION' || el.tagName === 'ARTICLE') {
        wrapOrphanInlines(el, document)
      }
      continue
    }
    run.push(child)
  }
  flush(null)
}

/** Live fallback when `content:encoded` is empty (2 known posts in the dump). */
export const scrapeArticleHtml = async (slug: string): Promise<string | null> => {
  if (!slug) return null
  const urls = [`https://nazemi.cz/${slug}/`, `https://www.nazemi.cz/${slug}/`]
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'nazemi-aktuality-import/1.0' },
        redirect: 'follow',
        signal: AbortSignal.timeout(25_000),
      })
      if (!res.ok) continue
      const html = await res.text()
      const dom = new JSDOM(html)
      const main = [...dom.window.document.querySelectorAll('.obsah-page-in')].find(
        (el) => !el.classList.contains('side'),
      )
      if (!main) continue
      main.querySelector('.clearfix')?.remove()
      for (const junk of main.querySelectorAll('script, style')) junk.remove()
      const inner = main.innerHTML.trim()
      if (inner.length > 40) return inner
    } catch {
      /* try next host */
    }
  }
  return null
}

const articleSlugFromHref = (href: string, slugs: Set<string>) => {
  try {
    const url = new URL(href)
    if (!NAZEMI_HOSTS.has(url.hostname.toLowerCase())) return null
    const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean)
    const aktualityAt = parts.indexOf('aktuality')
    if (aktualityAt >= 0 && parts[aktualityAt + 1] && slugs.has(parts[aktualityAt + 1])) {
      return parts[aktualityAt + 1]
    }
    const last = parts.at(-1)
    if (last && slugs.has(last) && !FILE_EXT_RE.test(last)) return last
    return null
  } catch {
    return null
  }
}

const unwrapMailchimp = (href: string) => {
  try {
    const url = new URL(href)
    if (!url.hostname.includes('list-manage.com')) return href
    const dest = url.searchParams.get('url') || url.searchParams.get('u0')
    return dest || href
  } catch {
    return href
  }
}

const stripWordJunk = (html: string) =>
  html
    .replace(/\[if[\s\S]*?\[endif\]/gi, '')
    .replace(/<\/?(?:w|o|m):[^>]*>/gi, '')
    .replace(/<xml[\s\S]*?<\/xml>/gi, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')

const expandShortcodes = (html: string, attachments: Map<string, WpAttachment>) => {
  let next = html.replace(/\[gallery[^\]]*ids=["']([^"']+)["'][^\]]*\]/gi, (_full, ids: string) =>
    ids
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .map((id) => {
        const att = attachments.get(id)
        if (!att) return ''
        return `<img class="wp-image-${id}" src="${att.url}" alt="${escapeAttr(att.alt)}" data-wp-id="${id}" data-wp-gallery="1" />`
      })
      .join('\n'),
  )

  next = next.replace(
    /\[caption([^\]]*)\]([\s\S]*?)\[\/caption\]/gi,
    (_full, attrs: string, inner: string) => {
      const idMatch = /id=["']attachment_(\d+)["']/.exec(attrs)
      const imgMatch = /<img\b[^>]*>/i.exec(inner)
      const caption = inner
        .replace(/<img\b[^>]*>/gi, '')
        .replace(/<\/?[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const img = imgMatch?.[0] || ''
      if (!img) return inner
      const withCaption = img.replace(/<img\b/i, `<img data-caption="${escapeAttr(caption)}"`)
      if (idMatch) {
        return withCaption.includes('wp-image-')
          ? withCaption
          : withCaption.replace(/<img\b/i, `<img class="wp-image-${idMatch[1]}"`)
      }
      return withCaption
    },
  )

  return next
}

const escapeAttr = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const parseWidthAttr = (img: Element): number | null => {
  if (img.getAttribute('data-wp-gallery') === '1') return null
  const raw = img.getAttribute('width')
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Consecutive images (= photo strip / informal gallery, or `[gallery]` shortcode)
 * stay full-bleed — no maxWidth. Shortcode imgs already have data-wp-gallery.
 */
const markGalleryStrips = (document: Document) => {
  const imageUnit = (img: Element): Element => {
    const parent = img.parentElement
    if (parent?.tagName === 'A') {
      const onlyImg = [...parent.childNodes].every(
        (node) => node === img || (node.nodeType === 3 && !node.textContent?.trim()),
      )
      if (onlyImg) return parent
    }
    return img
  }

  const isImageOnlyBlock = (el: Element) => {
    const imgs = el.querySelectorAll('img')
    if (imgs.length !== 1) return false
    const clone = el.cloneNode(true) as Element
    clone.querySelector('img')?.remove()
    return !clone.textContent?.trim()
  }

  const onlyEmptyBetween = (from: Element, to: Element) => {
    if (from.parentElement && from.parentElement === to.parentElement) {
      let node: Node | null = from.nextSibling
      while (node && node !== to) {
        if (node.nodeType === 3 && node.textContent?.trim()) return false
        if (node.nodeType === 1) {
          const el = node as Element
          if (el.tagName !== 'BR' && el.tagName !== 'WB') return false
        }
        node = node.nextSibling
      }
      return node === to
    }

    const fromBlock =
      from.parentElement && isImageOnlyBlock(from.parentElement) ? from.parentElement : from
    const toBlock = to.parentElement && isImageOnlyBlock(to.parentElement) ? to.parentElement : to
    if (!fromBlock.parentElement || fromBlock.parentElement !== toBlock.parentElement) return false
    let node: Node | null = fromBlock.nextSibling
    while (node && node !== toBlock) {
      if (node.nodeType === 3 && node.textContent?.trim()) return false
      if (node.nodeType === 1) {
        const el = node as Element
        if (el.tagName === 'BR') {
          node = node.nextSibling
          continue
        }
        if (!isImageOnlyBlock(el) || el.querySelector('img') === null) return false
      }
      node = node.nextSibling
    }
    return node === toBlock
  }

  const imgs = [...document.querySelectorAll('img')]
  let run: Element[] = []
  const flush = () => {
    if (run.length >= 2) {
      for (const img of run) img.setAttribute('data-wp-gallery', '1')
    }
    run = []
  }

  for (const img of imgs) {
    if (run.length === 0) {
      run.push(img)
      continue
    }
    const prev = run[run.length - 1]
    if (onlyEmptyBetween(imageUnit(prev), imageUnit(img))) run.push(img)
    else {
      flush()
      run.push(img)
    }
  }
  flush()
}

const unwrapLayoutTables = (document: Document) => {
  const tables = [...document.querySelectorAll('table')]
  for (const table of tables.reverse()) {
    const presentation =
      table.getAttribute('role') === 'presentation' ||
      /outlook|mj-|newsletter/i.test(table.getAttribute('class') || '')
    if (presentation) {
      unwrapThrough(table)
      continue
    }
    const rows = [...table.querySelectorAll('tr')]
    const fragment = document.createDocumentFragment()
    for (const row of rows) {
      const cells = [...row.querySelectorAll('th,td')].map((cell) => cell.textContent?.trim() || '')
      const p = document.createElement('p')
      p.textContent = cells.filter(Boolean).join(' — ')
      if (p.textContent) fragment.append(p)
    }
    table.replaceWith(fragment)
  }

  for (const tag of ['tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'colgroup', 'col']) {
    for (const el of [...document.querySelectorAll(tag)].reverse()) unwrapThrough(el)
  }
}

const unwrapThrough = (el: Element) => {
  const parent = el.parentNode
  if (!parent) {
    el.remove()
    return
  }
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  el.remove()
}

/**
 * WP/live HTML sometimes nests blocks inside `<strong>` (`<strong><p>…</p></strong>`).
 * Lexical drops / flattens that oddly — promote to `<p><strong>…</strong></p>`.
 */
const fixStrongBlockNesting = (document: Document) => {
  const blockTags = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'UL', 'OL', 'DIV', 'BLOCKQUOTE'])
  for (const strong of [...document.querySelectorAll('strong, b')].reverse()) {
    const blocks = [...strong.children].filter((child) => blockTags.has(child.tagName))
    if (!blocks.length) continue
    const parent = strong.parentNode
    if (!parent) continue
    for (const block of blocks) {
      const wrapper = document.createElement(strong.tagName.toLowerCase())
      while (block.firstChild) wrapper.append(block.firstChild)
      block.append(wrapper)
      parent.insertBefore(block, strong)
    }
    if (!strong.childNodes.length) strong.remove()
    else unwrapThrough(strong)
  }
}

const demoteHeadings = (document: Document) => {
  for (const h1 of document.querySelectorAll('h1')) {
    const h2 = document.createElement('h2')
    h2.innerHTML = h1.innerHTML
    h1.replaceWith(h2)
  }
  for (const tag of ['h4', 'h5', 'h6']) {
    for (const heading of document.querySelectorAll(tag)) {
      const h3 = document.createElement('h3')
      h3.innerHTML = heading.innerHTML
      heading.replaceWith(h3)
    }
  }
}

/** Headings already carry weight — drop nested bold/italic so FE stays coherent. */
const unwrapEmphasisInHeadings = (document: Document) => {
  for (const heading of document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    for (const el of [...heading.querySelectorAll('strong, b, em, i')].reverse()) {
      unwrapThrough(el)
    }
  }
}

const unwrapSpans = (document: Document) => {
  for (const span of [...document.querySelectorAll('span')].reverse()) {
    const style = span.getAttribute('style') || ''
    const bold = /font-weight\s*:\s*(bold|[6-9]00)/i.test(style)
    if (bold) {
      const strong = document.createElement('strong')
      strong.innerHTML = span.innerHTML
      span.replaceWith(strong)
      continue
    }
    unwrapThrough(span)
  }
  for (const b of document.querySelectorAll('b')) {
    const strong = document.createElement('strong')
    strong.innerHTML = b.innerHTML
    b.replaceWith(strong)
  }
}

const iframesToLinks = (document: Document) => {
  for (const iframe of document.querySelectorAll('iframe')) {
    const src = iframe.getAttribute('src') || ''
    const p = document.createElement('p')
    if (src) {
      const a = document.createElement('a')
      a.setAttribute('href', src)
      a.textContent = src
      p.append(a)
    }
    iframe.replaceWith(p)
  }
}

const wpImageId = (img: Element) => {
  const fromData = img.getAttribute('data-wp-id')
  if (fromData) return fromData
  const cls = img.getAttribute('class') || ''
  return /wp-image-(\d+)/.exec(cls)?.[1] || ''
}

const findAttachmentBySrc = (src: string, attachments: Map<string, WpAttachment>) => {
  if (!src) return undefined
  const original = originalImageUrl(src).split('?')[0]
  for (const att of attachments.values()) {
    if (att.url === src || att.url === original) return att
    if (att.file && (original.endsWith(`/${att.file}`) || original.endsWith(att.file))) return att
  }
  const base = path.basename(original)
  if (!base) return undefined
  const hits = [...attachments.values()].filter(
    (att) => path.basename(att.file || att.url) === base,
  )
  return hits.length === 1 ? hits[0] : undefined
}

/** True when element has no visible text/media (WP `&nbsp;` / lone `<br>` spacers). */
const isVisuallyEmpty = (el: Element): boolean => {
  if (el.querySelector('img, iframe, video, audio, svg, hr, object, embed')) return false
  if ((el.textContent || '').includes('[[[WPIMG:')) return false

  const text = (el.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
  return !text
}

/** Drop empty blocks/inlines that only create prose gap (40px between siblings). */
const removeEmptyElements = (document: Document) => {
  const tags = [
    'P',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'DIV',
    'SPAN',
    'STRONG',
    'EM',
    'B',
    'I',
    'SECTION',
    'ARTICLE',
    'FIGURE',
    'FIGCAPTION',
    'BLOCKQUOTE',
  ]

  let changed = true
  while (changed) {
    changed = false
    for (const tag of tags) {
      for (const el of [...document.querySelectorAll(tag)].reverse()) {
        if (!isVisuallyEmpty(el)) continue
        el.remove()
        changed = true
      }
    }
    for (const li of [...document.querySelectorAll('li')].reverse()) {
      if (!isVisuallyEmpty(li)) continue
      li.remove()
      changed = true
    }
    for (const list of [...document.querySelectorAll('ul, ol')].reverse()) {
      if (list.children.length > 0) continue
      list.remove()
      changed = true
    }
  }

  for (const br of [...document.querySelectorAll('br')]) {
    const parent = br.parentElement
    if (!parent) continue
    const onlyBr =
      [...parent.childNodes].every(
        (node) =>
          node === br ||
          (node.nodeType === 3 && !node.textContent?.replace(/\u00a0/g, ' ').trim()) ||
          (node.nodeType === 1 && (node as Element).tagName === 'BR'),
      ) && isVisuallyEmpty(parent)
    if (onlyBr && ['P', 'DIV', 'SPAN'].includes(parent.tagName)) parent.remove()
  }
}

export type PreparedHtml = {
  html: string
  markers: Map<string, MediaRef>
  nazemiFileHrefs: string[]
  thirdPartyFileHrefs: string[]
}

export const prepareHtml = ({
  attachments,
  content,
  slugs,
  thumbnailId,
}: {
  attachments: Map<string, WpAttachment>
  content: string
  slugs: Set<string>
  thumbnailId: string
}): PreparedHtml => {
  const markers = new Map<string, MediaRef>()
  const nazemiFileHrefs: string[] = []
  const thirdPartyFileHrefs: string[] = []
  const junked = paragraphizeLooseHtml(expandShortcodes(stripWordJunk(content), attachments))
  const dom = new JSDOM(`<body>${junked}</body>`)
  const document = dom.window.document
  if (document.body) wrapOrphanInlines(document.body, document)
  unwrapLayoutTables(document)
  fixStrongBlockNesting(document)
  demoteHeadings(document)
  unwrapEmphasisInHeadings(document)
  unwrapSpans(document)
  iframesToLinks(document)
  // After span unwrap / strong fixes, catch leftover orphan inlines.
  if (document.body) wrapOrphanInlines(document.body, document)
  markGalleryStrips(document)

  for (const a of document.querySelectorAll('a[href]')) {
    const href = unwrapMailchimp(a.getAttribute('href') || '')
    const articleSlug = articleSlugFromHref(href, slugs)
    if (articleSlug) {
      a.setAttribute('href', `/aktuality/${articleSlug}`)
      continue
    }
    if (isNazemiFileUrl(href)) {
      nazemiFileHrefs.push(href)
      a.setAttribute('href', href)
      continue
    }
    if (isThirdPartyUrl(href) && FILE_EXT_RE.test(href)) thirdPartyFileHrefs.push(href)
    a.setAttribute('href', href)
  }

  let skippedThumb = false
  const imgs = [...document.querySelectorAll('img')]
  for (const img of imgs) {
    const src = originalImageUrl(img.getAttribute('src') || '')
    const attFromClass = wpImageId(img)
    const att =
      (attFromClass && attachments.get(attFromClass)) || findAttachmentBySrc(src, attachments)
    const attId = att?.id || attFromClass
    const alt = img.getAttribute('alt') || ''
    const caption = img.getAttribute('data-caption') || ''
    const maxWidth = parseWidthAttr(img)
    if (!skippedThumb && thumbnailId && (attId === thumbnailId || att?.id === thumbnailId)) {
      skippedThumb = true
      img.remove()
      continue
    }

    let token = ''
    if (attId && attachments.has(attId)) {
      token = `a:${attId}`
      const existing = markers.get(token)
      if (!existing) {
        markers.set(token, {
          alt: alt || attachments.get(attId)!.alt,
          attachmentId: attId,
          caption,
          kind: 'attachment',
          maxWidth,
        })
      } else if (existing.maxWidth == null && maxWidth != null) {
        existing.maxWidth = maxWidth
      }
    } else if (src) {
      token = `u:${hashUrl(src)}`
      const existing = markers.get(token)
      if (!existing) {
        markers.set(token, { alt, caption, kind: 'url', maxWidth, url: src })
      } else if (existing.maxWidth == null && maxWidth != null) {
        existing.maxWidth = maxWidth
      }
    }
    if (!token) {
      img.remove()
      continue
    }
    const p = document.createElement('p')
    p.textContent = `[[[WPIMG:${token}]]]`
    const parent = img.parentElement
    const wrap =
      parent &&
      parent.tagName === 'A' &&
      [...parent.childNodes].every(
        (node) => node === img || (node.nodeType === 3 && !node.textContent?.trim()),
      )
        ? parent
        : img
    wrap.replaceWith(p)
  }

  removeEmptyElements(document)

  const html = (document.body?.innerHTML || '').trim()
  return { html, markers, nazemiFileHrefs, thirdPartyFileHrefs }
}

export const appendButton = (html: string, text: string, href: string) => {
  if (!text || !href) return html
  return `${html}<p><a href="${escapeAttr(href)}">${escapeAttr(text)}</a></p>`
}

const uploadNode = (resolved: UploadResolve): LexNode => ({
  fields: {
    ...(resolved.maxWidth != null
      ? { maxWidth: resolved.maxWidth, widthMode: 'px' }
      : { widthMode: 'auto' }),
  },
  format: '',
  id: null,
  relationTo: 'media',
  type: 'upload',
  value: resolved.id,
  version: 3,
})

const MARKER_RE = /\[\[\[WPIMG:([^\]]+)\]\]\]/g

const injectUploads = (
  nodes: LexNode[],
  resolve: (token: string) => UploadResolve | null,
): LexNode[] => {
  const out: LexNode[] = []
  for (const node of nodes) {
    if (node.children) node.children = injectUploads(node.children, resolve)
    if (node.type !== 'paragraph' || !node.children?.length) {
      out.push(node)
      continue
    }
    const parts: LexNode[] = []
    let buffer: LexNode[] = []
    const flushText = () => {
      if (!buffer.length) return
      parts.push({ ...node, children: buffer })
      buffer = []
    }
    const dumpText = (children: LexNode[]) =>
      children
        .filter((child) => child.type === 'text')
        .map((child) => child.text || '')
        .join('')
    const joined = dumpText(node.children)
    if (!joined.includes('[[[WPIMG:')) {
      out.push(node)
      continue
    }
    const chunks = joined.split(MARKER_RE)
    for (let i = 0; i < chunks.length; i++) {
      if (i % 2 === 1) {
        flushText()
        const resolved = resolve(chunks[i])
        if (resolved) parts.push(uploadNode(resolved))
        continue
      }
      const text = chunks[i]
      if (text.trim()) {
        buffer = [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text,
            type: 'text',
            version: 1,
          },
        ]
        flushText()
      }
    }
    flushText()
    if (parts.length) out.push(...parts)
    else out.push(node)
  }
  return out
}

const lexText = (node: LexNode): string => {
  if (node.type === 'text') return (node.text || '').replace(/\u00a0/g, ' ')
  if (node.type === 'linebreak') return ''
  return (node.children || []).map(lexText).join('')
}

const isEmptyLexNode = (node: LexNode): boolean => {
  if (
    node.type === 'upload' ||
    node.type === 'horizontalrule' ||
    node.type === 'relationship' ||
    node.type === 'block'
  ) {
    return false
  }
  if (node.type === 'text') return !lexText(node).trim()
  if (node.type === 'linebreak') return true

  const children = node.children || []
  if (!children.length) {
    return ['paragraph', 'heading', 'quote', 'list', 'listitem'].includes(String(node.type || ''))
  }
  return children.every(isEmptyLexNode)
}

const stripEmptyLexical = (nodes: LexNode[]): LexNode[] =>
  nodes
    .map((node) =>
      node.children ? { ...node, children: stripEmptyLexical(node.children) } : node,
    )
    .filter((node) => !isEmptyLexNode(node))

export const htmlToLexical = async (
  html: string,
  payload: Payload,
  resolve: (token: string) => UploadResolve | null,
) => {
  const editorConfig = await getEditorConfig(payload)
  const value = convertHTMLToLexical({
    editorConfig,
    html,
    JSDOM,
  }) as unknown as { root?: LexNode }

  const root = value?.root
  if (!root?.children?.length) return null
  root.children = stripEmptyLexical(injectUploads(root.children, resolve))
  const usable = root.children.some((node) => {
    if (node.type === 'upload') return true
    if (node.type === 'text' && node.text?.trim()) return true
    const text = JSON.stringify(node)
    return /"text":"[^"]/.test(text) || node.type === 'upload'
  })
  if (!usable) return null
  return value
}

export const rewriteFileHrefs = (html: string, urlToMediaUrl: Map<string, string>) => {
  let next = html
  for (const [from, to] of urlToMediaUrl) {
    next = next.split(from).join(to)
  }
  return next
}

export const seoDescription = (post: { excerpt: string; yoastDesc: string; content: string }) => {
  if (post.yoastDesc.trim()) return post.yoastDesc.trim()
  if (post.excerpt.trim()) {
    const plain = post.excerpt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (plain) return plain
  }
  if (!post.content.trim()) return ''
  return excerptFromHtml(post.content)
}

export { excerptFromHtml }

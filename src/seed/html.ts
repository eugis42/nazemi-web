import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import type { Payload } from 'payload'

type LexicalValue = Record<string, unknown>

let editorConfigPromise: Promise<Awaited<ReturnType<typeof editorConfigFactory.default>>> | null =
  null

const getEditorConfig = (payload: Payload) => {
  if (!editorConfigPromise) {
    editorConfigPromise = editorConfigFactory.default({ config: payload.config })
  }
  return editorConfigPromise
}

/** Minimal Lexical value for a single plain paragraph. */
export const richText = (text: string): LexicalValue => ({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text,
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
})

/** Lexical value from several plain paragraphs. */
export const richTextParagraphs = (paragraphs: string[]): LexicalValue => ({
  root: {
    children: paragraphs.filter(Boolean).map((text) => ({
      children: [
        {
          detail: 0,
          format: 0,
          mode: 'normal',
          style: '',
          text,
          type: 'text',
          version: 1,
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      textFormat: 0,
      type: 'paragraph',
      version: 1,
    })),
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
})

/**
 * Design bodies are authored as HTML (`bodyHtml`). Convert them to Lexical so the
 * admin gets editable rich text instead of an HTML blob.
 * Optional `uploadId` replaces `<!--DEMO_PROSE_IMAGE-->` with a media upload node.
 */
export const richTextFromHtml = async (
  html: string,
  payload: Payload,
  options?: { uploadId?: number | string },
): Promise<LexicalValue> => {
  const editorConfig = await getEditorConfig(payload)
  const value = convertHTMLToLexical({
    editorConfig,
    html: normaliseHtml(html),
    JSDOM,
  }) as unknown as LexicalValue

  const root = value?.root as { children?: unknown[] } | undefined
  if (!root?.children?.length) {
    return richTextParagraphs(htmlToPlainParagraphs(html))
  }

  if (options?.uploadId != null && html.includes('<!--DEMO_PROSE_IMAGE-->')) {
    const uploadNode = {
      type: 'upload',
      version: 3,
      relationTo: 'media',
      value: options.uploadId,
      fields: {},
      format: '',
      id: null,
    }
    // Insert after the paragraph that follows the blockquote (design figure position).
    const children = root.children as Record<string, unknown>[]
    const quoteIndex = children.findIndex((node) => node.type === 'quote')
    const insertAt = quoteIndex >= 0 ? Math.min(quoteIndex + 2, children.length) : Math.min(4, children.length)
    children.splice(insertAt, 0, uploadNode)
  }

  return value
}

/**
 * `<dl>` has no Lexical equivalent; flatten definition lists into headings + paragraphs
 * so nothing gets dropped during conversion.
 */
const normaliseHtml = (html: string) =>
  html
    .replace(/<dl>|<\/dl>/g, '')
    .replace(/<dt>([\s\S]*?)<\/dt>/g, '<p><strong>$1</strong></p>')
    .replace(/<dd>([\s\S]*?)<\/dd>/g, '<p>$1</p>')
    .replace(/<h4>/g, '<h3>')
    .replace(/<\/h4>/g, '</h3>')
    // Default Lexical editor has no table / code / figure nodes — flatten for seed.
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
    .replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '')
    .replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<\/?figcaption[^>]*>/gi, '')

/** Fallback used when HTML conversion yields nothing usable. */
const htmlToPlainParagraphs = (html: string) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, '')
    .split(/<\/(?:p|h1|h2|h3|h4|li|blockquote|dd|dt)>/)
    .map((chunk) =>
      chunk
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)

/** First sentences of an HTML body — used for perex/description fallbacks. */
export const excerptFromHtml = (html: string, maxLength = 220) => {
  const [first = ''] = htmlToPlainParagraphs(html).filter((chunk) => chunk.length > 40)
  if (first.length <= maxLength) return first
  return `${first.slice(0, maxLength).replace(/\s+\S*$/, '')}…`
}

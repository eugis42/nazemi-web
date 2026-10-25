/**
 * Secure iframe embeds: never render pasted HTML / scripts.
 * Accept URL or <iframe src="…"> paste → keep https src (+ optional size attrs).
 */

const IFRAME_TAG_RE = /<iframe\b[^>]*>/i

const ATTR_RE = (name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')

const FORBIDDEN_IN_PASTE = /<\s*(script|object|embed|link|meta|base)\b/i

export type SafeIframeEmbed = {
  src: string
  /** CSS length or bare px number from paste; omit → FE default */
  width?: string
  height?: string
}

/** Decode common HTML entities in extracted attribute values. */
function decodeBasicEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
}

function readAttr(tag: string, name: string): string | null {
  const match = tag.match(ATTR_RE(name))
  if (!match) return null
  const raw = (match[1] ?? match[2] ?? match[3] ?? '').trim()
  if (!raw) return null
  return decodeBasicEntities(raw)
}

/** Allow only plain sizes: 560, 560px, 100%, 50vw (no url()/calc/expressions). */
function sanitizeSize(value: string | null): string | undefined {
  if (!value) return undefined
  const v = value.trim()
  if (!/^\d+(\.\d+)?(px|%|vw|vh|rem|em)?$/i.test(v)) return undefined
  return v
}

function normalizeHttpsSrc(candidate: string): string | null {
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  if (url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  if (!url.hostname) return null

  return url.toString()
}

/**
 * Public https embed URL + optional paste sizes, or null if unsafe / invalid.
 * Browser loads the frame — we still refuse javascript:/data:/http: and userinfo.
 */
export function resolveSafeIframeEmbed(input: unknown): SafeIframeEmbed | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // Refuse paste that includes executable / document-control tags.
  if (FORBIDDEN_IN_PASTE.test(trimmed)) return null

  let candidate = trimmed
  let width: string | undefined
  let height: string | undefined

  if (/<iframe\b/i.test(trimmed)) {
    const tagMatch = trimmed.match(IFRAME_TAG_RE)
    if (!tagMatch) return null
    const tag = tagMatch[0]
    const fromIframe = readAttr(tag, 'src')
    if (!fromIframe) return null
    candidate = fromIframe
    width = sanitizeSize(readAttr(tag, 'width'))
    height = sanitizeSize(readAttr(tag, 'height'))
  }

  const src = normalizeHttpsSrc(candidate)
  if (!src) return null

  return { src, width, height }
}

/** @deprecated Prefer resolveSafeIframeEmbed — kept for call sites that only need src. */
export function resolveSafeIframeSrc(input: unknown): string | null {
  return resolveSafeIframeEmbed(input)?.src ?? null
}

export function validateIframeEmbedSource(value: unknown): true | string {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Vložte https URL nebo kód <iframe>.'
  }
  if (!resolveSafeIframeEmbed(value)) {
    return 'Povolen jen bezpečný https odkaz (nebo <iframe src="https://…">). Skripty a http:// nejdou.'
  }
  return true
}

/** Sandbox for third-party players (Maps/YouTube need same-origin + scripts). */
export const IFRAME_SANDBOX =
  'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-popups-to-escape-sandbox'

export const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen'

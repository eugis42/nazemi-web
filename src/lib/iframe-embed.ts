/**
 * Secure embeds: never render pasted HTML / inline JS.
 * Accept https URL, <iframe src>, or allowlisted <script src> → controlled FE mount.
 */

const IFRAME_TAG_RE = /<iframe\b[^>]*>/i

const ATTR_RE = (name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')

/** Tags that must never appear except a lone allowlisted external <script>. */
const FORBIDDEN_IN_PASTE = /<\s*(object|embed|link|meta|base)\b/i
const ANY_SCRIPT_RE = /<\s*script\b/i
const ANY_IFRAME_RE = /<\s*iframe\b/i

/**
 * Hosts allowed to load as external <script> (widget CDNs).
 * Bare https URL on these hosts → script mode (not iframe).
 * Extend only after reviewing the vendor.
 */
export const SCRIPT_EMBED_HOST_ALLOWLIST = new Set(['widget.proca.app'])

export type SafeIframeEmbed = {
  kind: 'iframe' | 'script'
  src: string
  /** CSS length or bare px number from paste; omit → FE default (iframe only) */
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

function isAllowlistedScriptHost(src: string): boolean {
  try {
    const { hostname } = new URL(src)
    return SCRIPT_EMBED_HOST_ALLOWLIST.has(hostname.toLowerCase())
  } catch {
    return false
  }
}

/**
 * Lone external <script src="https://…"> (no inline body, no other markup).
 * Self-closing and normal close tags both OK.
 */
function extractLoneExternalScriptSrc(trimmed: string): string | null {
  const match = trimmed.match(/^<script\b([^>]*)(?:\/>|>([\s\S]*)<\/script>)$/i)
  if (!match) return null
  const attrs = match[1] ?? ''
  const body = match[2]
  if (body !== undefined && body.trim() !== '') return null
  if (/\bsrcdoc\b/i.test(attrs)) return null
  return readAttr(`<script${attrs}>`, 'src')
}

/**
 * Public https embed URL + optional paste sizes, or null if unsafe / invalid.
 * Allowlisted widget hosts → kind script; everything else → sandboxed iframe.
 */
export function resolveSafeIframeEmbed(input: unknown): SafeIframeEmbed | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  if (FORBIDDEN_IN_PASTE.test(trimmed)) return null

  // Lone external <script src> on allowlist → script embed (never inline / never raw HTML).
  if (ANY_SCRIPT_RE.test(trimmed)) {
    if (ANY_IFRAME_RE.test(trimmed)) return null
    const fromScript = extractLoneExternalScriptSrc(trimmed)
    if (!fromScript) return null
    const src = normalizeHttpsSrc(fromScript)
    if (!src || !isAllowlistedScriptHost(src)) return null
    return { kind: 'script', src }
  }

  let candidate = trimmed
  let width: string | undefined
  let height: string | undefined

  if (ANY_IFRAME_RE.test(trimmed)) {
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

  // Bare URL (or iframe src) on widget allowlist → load as script, not dead JS-in-iframe.
  if (isAllowlistedScriptHost(src)) {
    return { kind: 'script', src }
  }

  return { kind: 'iframe', src, width, height }
}

/** @deprecated Prefer resolveSafeIframeEmbed — kept for call sites that only need src. */
export function resolveSafeIframeSrc(input: unknown): string | null {
  return resolveSafeIframeEmbed(input)?.src ?? null
}

export function validateIframeEmbedSource(value: unknown): true | string {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Vložte https URL, <iframe>, nebo povolený <script src="https://…">.'
  }
  if (!resolveSafeIframeEmbed(value)) {
    return 'Povolen jen bezpečný https odkaz, <iframe>, nebo <script> z dovoleného hostitele (např. widget.proca.app). Inline skripty a http:// nejdou.'
  }
  return true
}

/** Sandbox for third-party players (Maps/YouTube need same-origin + scripts). */
export const IFRAME_SANDBOX =
  'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-popups-to-escape-sandbox'

export const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen'

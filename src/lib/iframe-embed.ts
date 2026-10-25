/**
 * Secure iframe embeds: never render pasted HTML / scripts.
 * Accept URL or <iframe src="…"> paste → keep https src only.
 */

const IFRAME_SRC_RE =
  /<iframe\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i

const FORBIDDEN_IN_PASTE = /<\s*(script|object|embed|link|meta|base)\b/i

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

function extractIframeSrc(html: string): string | null {
  const match = html.match(IFRAME_SRC_RE)
  if (!match) return null
  const raw = (match[1] ?? match[2] ?? match[3] ?? '').trim()
  if (!raw) return null
  return decodeBasicEntities(raw)
}

/**
 * Public https embed URL, or null if unsafe / invalid.
 * Browser loads the frame — we still refuse javascript:/data:/http: and userinfo.
 */
export function resolveSafeIframeSrc(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // Refuse paste that includes executable / document-control tags.
  if (FORBIDDEN_IN_PASTE.test(trimmed)) return null

  let candidate = trimmed
  if (/<iframe\b/i.test(trimmed)) {
    const fromIframe = extractIframeSrc(trimmed)
    if (!fromIframe) return null
    candidate = fromIframe
  }

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

export function validateIframeEmbedSource(value: unknown): true | string {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Vložte https URL nebo kód <iframe>.'
  }
  if (!resolveSafeIframeSrc(value)) {
    return 'Povolen jen bezpečný https odkaz (nebo <iframe src="https://…">). Skripty a http:// nejdou.'
  }
  return true
}

/** Sandbox for third-party players (Maps/YouTube need same-origin + scripts). */
export const IFRAME_SANDBOX =
  'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-popups-to-escape-sandbox'

export const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen'

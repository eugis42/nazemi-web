/**
 * Fetch + parse Open Graph / Twitter / HTML title for external link cards.
 * Used only from authenticated admin preview API — never on public page render.
 */

const FETCH_TIMEOUT_MS = 10_000
const MAX_HTML_BYTES = 1_500_000
const MAX_IMAGE_BYTES = 5_000_000
const MAX_REDIRECTS = 3

export type OpenGraphResult = {
  description: string | null
  imageUrl: string | null
  title: string | null
  url: string
}

function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '')
  if (h === 'localhost' || h === 'metadata.google.internal') return true
  if (h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true

  // IPv4 literals
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  }

  // IPv6 literals (coarse)
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true

  return false
}

/** Public http(s) only — blocks SSRF to private/link-local hosts. */
export function assertPublicHttpUrl(raw: string): URL {
  let parsed: URL
  try {
    parsed = new URL(raw.trim())
  } catch {
    throw new Error('Neplatná URL.')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL musí být http:// nebo https://.')
  }
  if (parsed.username || parsed.password) {
    throw new Error('URL nesmí obsahovat přihlašovací údaje.')
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new Error('URL cílí na neveřejný host.')
  }
  return parsed
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
}

function metaContents(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(
      `<meta\\b[^>]*\\b(?:property|name)=["']${escaped}["'][^>]*\\bcontent=["']([^"']*)["'][^>]*>`,
      'i',
    ),
    new RegExp(
      `<meta\\b[^>]*\\bcontent=["']([^"']*)["'][^>]*\\b(?:property|name)=["']${escaped}["'][^>]*>`,
      'i',
    ),
  ]
  for (const re of patterns) {
    const match = re.exec(html)
    if (match?.[1]?.trim()) return decodeEntities(match[1].trim())
  }
  return null
}

function htmlTitle(html: string): string | null {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html)
  const t = match?.[1]?.trim()
  return t ? decodeEntities(t) : null
}

async function fetchWithLimits(
  url: URL,
  opts: { accept: string; maxBytes: number },
): Promise<{ buffer: Buffer; contentType: string | null; finalUrl: URL }> {
  let current = url
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertPublicHttpUrl(current.toString())
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(current.toString(), {
        headers: {
          Accept: opts.accept,
          'User-Agent': 'NaZemiOGPreview/1.0 (+https://nazemi.cz)',
        },
        redirect: 'manual',
        signal: controller.signal,
      })

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get('location')
        if (!loc) throw new Error('Přesměrování bez Location.')
        current = new URL(loc, current)
        continue
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const contentType = res.headers.get('content-type')
      const reader = res.body?.getReader()
      if (!reader) throw new Error('Prázdná odpověď.')

      const chunks: Uint8Array[] = []
      let total = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (!value) continue
        total += value.byteLength
        if (total > opts.maxBytes) {
          reader.cancel().catch(() => undefined)
          throw new Error('Odpověď je příliš velká.')
        }
        chunks.push(value)
      }
      return {
        buffer: Buffer.concat(chunks.map((c) => Buffer.from(c))),
        contentType,
        finalUrl: current,
      }
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error('Příliš mnoho přesměrování.')
}

export async function fetchOpenGraph(rawUrl: string): Promise<OpenGraphResult> {
  const start = assertPublicHttpUrl(rawUrl)
  const { buffer, finalUrl } = await fetchWithLimits(start, {
    accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    maxBytes: MAX_HTML_BYTES,
  })
  const html = buffer.toString('utf8')

  const title =
    metaContents(html, 'og:title') ||
    metaContents(html, 'twitter:title') ||
    htmlTitle(html)
  const description =
    metaContents(html, 'og:description') ||
    metaContents(html, 'twitter:description') ||
    metaContents(html, 'description')
  const imageRaw =
    metaContents(html, 'og:image') ||
    metaContents(html, 'og:image:url') ||
    metaContents(html, 'twitter:image') ||
    metaContents(html, 'twitter:image:src')

  let imageUrl: string | null = null
  if (imageRaw) {
    try {
      imageUrl = new URL(imageRaw, finalUrl).toString()
      assertPublicHttpUrl(imageUrl)
    } catch {
      imageUrl = null
    }
  }

  return {
    description,
    imageUrl,
    title,
    url: finalUrl.toString(),
  }
}

export async function downloadPublicImage(
  imageUrl: string,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const url = assertPublicHttpUrl(imageUrl)
  const { buffer, contentType, finalUrl } = await fetchWithLimits(url, {
    accept: 'image/*,*/*;q=0.8',
    maxBytes: MAX_IMAGE_BYTES,
  })

  const mime = (contentType || '').split(';')[0]?.trim().toLowerCase() || ''
  if (!mime.startsWith('image/')) {
    throw new Error('OG obrázek není image/*.')
  }

  const extFromMime =
    mime === 'image/jpeg' || mime === 'image/jpg'
      ? 'jpg'
      : mime === 'image/png'
        ? 'png'
        : mime === 'image/webp'
          ? 'webp'
          : mime === 'image/gif'
            ? 'gif'
            : 'img'

  const base =
    pathBasename(finalUrl.pathname).replace(/[^\w.-]+/g, '-').slice(0, 48) || 'og-image'
  const filename = base.includes('.') ? base : `${base}.${extFromMime}`

  return { buffer, filename, mimeType: mime }
}

function pathBasename(pathname: string): string {
  const part = pathname.split('/').filter(Boolean).pop() || ''
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}

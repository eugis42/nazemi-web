import { foldDiacritics } from '@/lib/diacritics'

/** Route segments that are navigation, not content keywords. */
const ROUTE_SEGMENTS = new Set([
  'aktuality',
  'api',
  'hledat',
  'kalendar',
  'kontakt',
  'page',
  'projekty',
  'publikace',
  'workshopy',
])

/** Tiny / function words — noise in URL slugs. */
const STOPWORDS = new Set(
  [
    'a',
    'an',
    'and',
    'co',
    'do',
    'for',
    'i',
    'jak',
    'je',
    'k',
    'ke',
    'ku',
    'na',
    'nebo',
    'o',
    'od',
    'of',
    'po',
    'pro',
    'pri',
    's',
    'se',
    'the',
    'to',
    'u',
    'v',
    've',
    'z',
    'ze',
  ].map((w) => foldDiacritics(w)),
)

/**
 * Turn a 404 pathname into a search query (slug words, no route noise).
 * Empty string = don't prefill.
 */
export function keywordsFromPathname(pathname: string): string {
  let path = pathname.split('?')[0] || ''
  try {
    path = decodeURIComponent(path)
  } catch {
    /* keep raw */
  }
  path = path.replace(/\/+/g, '/').replace(/\/$/, '') || '/'

  const segments = path.split('/').filter(Boolean)
  const content = segments.filter((seg) => {
    const folded = foldDiacritics(seg.toLocaleLowerCase('cs'))
    if (ROUTE_SEGMENTS.has(folded)) return false
    if (/^\d+$/.test(seg)) return false
    return true
  })

  // Prefer last content slug (article/page title); fall back to all leftovers.
  const slug = content[content.length - 1] || ''
  const words = slug
    .split(/[-_]+/)
    .map((w) => w.trim())
    .filter((w) => {
      if (w.length < 2) return false
      const folded = foldDiacritics(w.toLocaleLowerCase('cs'))
      if (STOPWORDS.has(folded)) return false
      if (/^\d+$/.test(w)) return false
      return true
    })

  return words.join(' ').trim()
}

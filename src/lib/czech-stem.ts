import { createRequire } from 'node:module'

import { foldDiacritics } from '@/lib/diacritics'

const require = createRequire(import.meta.url)
/** Aggressive Czech stemmer (Jacques Savoy / Dolamic port). */
const stemAggressive = require('czech-stemmer') as (word: string) => string

const TOKEN_RE = /[\p{L}\p{N}]+/gu

/** Split on non-letters; keep tokens ≥2 chars. */
export function tokenizeSearchText(value: string): string[] {
  const tokens: string[] = []
  const matches = value.toLocaleLowerCase('cs').match(TOKEN_RE)
  if (!matches) return tokens
  for (const token of matches) {
    if (token.length >= 2) tokens.push(token)
  }
  return tokens
}

export function stemCzechWord(word: string): string {
  if (!word) return ''
  try {
    return stemAggressive(word) || word
  } catch {
    return word
  }
}

/** Folded stem for one surface form (diacritic-insensitive matching). */
export function foldedStem(word: string): string {
  return foldDiacritics(stemCzechWord(word))
}

/**
 * Build indexed search blob: folded surface tokens + folded stems.
 * Space-padded so SQL `contains` matches whole tokens only
 * (` transforma ` ⊄ ` transformativ `).
 */
export function buildSearchText(value: string): string {
  const parts = new Set<string>()
  for (const token of tokenizeSearchText(value)) {
    parts.add(foldDiacritics(token))
    const stem = foldedStem(token)
    if (stem) parts.add(stem)
  }
  if (!parts.size) return ''
  return ` ${[...parts].join(' ')} `
}

/** Query terms to require in searchText (AND). Space-padded whole-token match. */
export function querySearchTerms(query: string): string[] {
  const terms: string[] = []
  const seen = new Set<string>()
  for (const token of tokenizeSearchText(query)) {
    const stem = foldedStem(token)
    const folded = foldDiacritics(token)
    const primary = stem || folded
    if (primary.length < 2 || seen.has(primary)) continue
    seen.add(primary)
    terms.push(` ${primary} `)
  }
  return terms
}

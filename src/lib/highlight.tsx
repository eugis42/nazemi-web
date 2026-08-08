import type { ReactNode } from 'react'

import { foldedStem, tokenizeSearchText } from '@/lib/czech-stem'
import { foldDiacritics, foldDiacriticsWithMap } from '@/lib/diacritics'

/** Split query into folded tokens (≥2 chars), longest first. */
export function searchTokens(query: string): string[] {
  const seen = new Set<string>()
  const tokens: string[] = []
  for (const raw of tokenizeSearchText(query)) {
    const token = foldDiacritics(raw)
    if (token.length < 2 || seen.has(token)) continue
    seen.add(token)
    tokens.push(token)
  }
  return tokens.sort((a, b) => b.length - a.length)
}

function queryStemSet(query: string): Set<string> {
  const stems = new Set<string>()
  for (const token of tokenizeSearchText(query)) {
    const stem = foldedStem(token)
    if (stem.length >= 2) stems.add(stem)
    const folded = foldDiacritics(token)
    if (folded.length >= 2) stems.add(folded)
  }
  return stems
}

type MatchRange = { end: number; start: number }

function collectFoldMatches(text: string, tokens: string[]): MatchRange[] {
  if (!text || !tokens.length) return []
  const { folded, indexMap } = foldDiacriticsWithMap(text)
  const ranges: MatchRange[] = []

  for (const token of tokens) {
    let from = 0
    while (from < folded.length) {
      const at = folded.indexOf(token, from)
      if (at < 0) break
      const start = indexMap[at]
      const lastFolded = at + token.length - 1
      const endStart = indexMap[lastFolded]
      const codePoint = text.codePointAt(endStart) ?? 0
      const end = endStart + (codePoint > 0xffff ? 2 : 1)
      ranges.push({ end, start })
      from = at + token.length
    }
  }

  return mergeRanges(ranges)
}

/** Highlight whole words whose Czech stem matches a query stem. */
function collectStemWordMatches(text: string, stems: Set<string>): MatchRange[] {
  if (!text || !stems.size) return []
  const ranges: MatchRange[] = []
  const tokenRe = /[\p{L}\p{N}]+/gu
  let match: RegExpExecArray | null
  while ((match = tokenRe.exec(text)) !== null) {
    const word = match[0]
    if (word.length < 2) continue
    const stem = foldedStem(word)
    const folded = foldDiacritics(word)
    if (stems.has(stem) || stems.has(folded)) {
      ranges.push({ end: match.index + word.length, start: match.index })
    }
  }
  return mergeRanges(ranges)
}

function mergeRanges(ranges: MatchRange[]): MatchRange[] {
  if (!ranges.length) return []
  ranges.sort((a, b) => a.start - b.start || b.end - a.end)
  const merged: MatchRange[] = []
  for (const range of ranges) {
    const prev = merged[merged.length - 1]
    if (prev && range.start <= prev.end) {
      prev.end = Math.max(prev.end, range.end)
    } else {
      merged.push({ ...range })
    }
  }
  return merged
}

/**
 * Wrap matches in `<mark>`.
 * Diacritic-insensitive + Czech stem-aware (transformace ↔ transformací).
 */
export function highlightText(text: string, query: string): ReactNode {
  if (!text) return null
  const tokens = searchTokens(query)
  const stems = queryStemSet(query)
  if (!tokens.length && !stems.size) return text

  const ranges = mergeRanges([
    ...collectFoldMatches(text, tokens),
    ...collectStemWordMatches(text, stems),
  ])
  if (!ranges.length) return text

  const nodes: ReactNode[] = []
  let cursor = 0
  ranges.forEach((range, index) => {
    if (range.start > cursor) nodes.push(text.slice(cursor, range.start))
    nodes.push(
      <mark className="bg-green/40 text-ground" key={`${range.start}-${index}`}>
        {text.slice(range.start, range.end)}
      </mark>,
    )
    cursor = range.end
  })
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

/** ~160 chars of plain text centered on first query hit. */
export function snippetAroundQuery(text: string, query: string, radius = 80): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ''

  const tokens = searchTokens(query)
  const stems = queryStemSet(query)
  const ranges = mergeRanges([
    ...collectFoldMatches(clean, tokens),
    ...collectStemWordMatches(clean, stems),
  ])
  const hit = ranges[0]

  if (!hit) {
    return clean.length <= radius * 2 ? clean : `${clean.slice(0, radius * 2 - 1).trim()}…`
  }

  const start = Math.max(0, hit.start - radius)
  const end = Math.min(clean.length, hit.end + radius)
  const slice = clean.slice(start, end).trim()
  return `${start > 0 ? '…' : ''}${slice}${end < clean.length ? '…' : ''}`
}

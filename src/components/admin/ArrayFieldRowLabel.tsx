'use client'

import { useRowLabel } from '@payloadcms/ui'

/** Prefer first non-empty string among common array-row title fields. */
const CANDIDATES = [
  'title',
  'label',
  'headline',
  'prefix',
  'name',
  'author',
  'text',
  'item',
  'network',
  'quote',
] as const

function pickLabel(data: Record<string, unknown> | undefined): string {
  if (!data) return ''
  for (const key of CANDIDATES) {
    const raw = data[key]
    if (typeof raw !== 'string') continue
    const text = raw.trim()
    if (!text) continue
    if (key === 'quote' && text.length > 48) return `${text.slice(0, 48)}…`
    return text
  }
  return ''
}

/** Generic collapsed array row: title/label/name/… instead of „Položka 01“. */
export function ArrayFieldRowLabel() {
  const { data, rowNumber } = useRowLabel<Record<string, unknown>>()
  const text = pickLabel(data)
  return <span>{text || `Položka ${String(rowNumber ?? 0).padStart(2, '0')}`}</span>
}

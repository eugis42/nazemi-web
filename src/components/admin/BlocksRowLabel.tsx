'use client'

import { useRowLabel } from '@payloadcms/ui'

const BLOCK_TYPE_LABELS: Record<string, string> = {
  hero: 'Hero',
  events: 'Události',
  pillars: 'Pilíře',
  news: 'Aktuality',
  projects: 'Projekty',
  about: 'O nás',
  richText: 'Textový blok',
  gallery: 'Galerie',
  pageIntro: 'Úvodní hlavička',
  pageHeader: 'Úvodní hlavička',
  speakers: 'Lektoři',
  lecturers: 'Lektoři',
  testimonials: 'Reference',
  threeColumns: '3 sloupce',
  threeCards: '3 karty',
}

type BlockRowData = {
  blockType?: string | null
  title?: string | null
  caption?: string | null
  segments?: { text?: string | null }[] | null
}

/** Collapsed block row: block title (or hero segments), else type label. */
export function BlocksRowLabel() {
  const { data, rowNumber } = useRowLabel<BlockRowData>()
  const typeKey = typeof data?.blockType === 'string' ? data.blockType : ''
  const typeLabel = BLOCK_TYPE_LABELS[typeKey] || typeKey || 'Blok'
  const fromSegments = Array.isArray(data?.segments)
    ? data.segments
        .map((s) => (typeof s?.text === 'string' ? s.text.trim() : ''))
        .filter(Boolean)
        .join(' ')
    : ''
  const title =
    (typeof data?.title === 'string' && data.title.trim()) ||
    fromSegments ||
    (typeof data?.caption === 'string' && data.caption.trim()) ||
    ''
  const n = String(rowNumber ?? 0).padStart(2, '0')
  return <span>{title || `${typeLabel} ${n}`}</span>
}

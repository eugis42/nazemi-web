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
  pageHeader: 'Úvodní hlavička',
  lecturers: 'Lektoři',
  testimonials: 'Reference',
}

type BlockRowData = {
  blockType?: string | null
  title?: string | null
  segments?: { text?: string | null }[] | null
}

/** Collapsed block row: type + title/segment, not „Bez názvu“. */
export function BlocksRowLabel() {
  const { data, rowNumber } = useRowLabel<BlockRowData>()
  const typeKey = typeof data?.blockType === 'string' ? data.blockType : ''
  const typeLabel = BLOCK_TYPE_LABELS[typeKey] || typeKey || 'Blok'
  const title =
    (typeof data?.title === 'string' && data.title.trim()) ||
    (typeof data?.segments?.[0]?.text === 'string' && data.segments[0].text.trim()) ||
    ''
  const n = String(rowNumber ?? 0).padStart(2, '0')
  return <span>{title ? `${typeLabel}: ${title}` : `${typeLabel} ${n}`}</span>
}

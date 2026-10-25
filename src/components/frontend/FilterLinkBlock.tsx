import Link from 'next/link'

import { FilterIcon } from '@/components/frontend/icons'
import { hrefWith } from '@/lib/content'

export type FilterLinkTarget =
  | 'kalendar'
  | 'aktuality'
  | 'workshopy-topic'
  | 'workshopy-audience'
  | 'publikace-type'
  | 'publikace-topic'

export type FilterLinkBlockData = {
  audience?: unknown
  publicationType?: unknown
  tag?: unknown
  target?: FilterLinkTarget | string | null
  [key: string]: unknown
}

const TARGET_META: Record<
  FilterLinkTarget,
  { collectionLabel: string; param: string; path: string }
> = {
  kalendar: { collectionLabel: 'Kalendář', param: 'tag', path: '/kalendar' },
  aktuality: { collectionLabel: 'Aktuality', param: 'tag', path: '/aktuality' },
  'workshopy-topic': { collectionLabel: 'Workshopy', param: 'topic', path: '/workshopy' },
  'workshopy-audience': {
    collectionLabel: 'Workshopy',
    param: 'audience',
    path: '/workshopy',
  },
  'publikace-type': { collectionLabel: 'Publikace', param: 'filter', path: '/publikace' },
  'publikace-topic': { collectionLabel: 'Publikace', param: 'topic', path: '/publikace' },
}

function taxonomyDoc(value: unknown): { slug: string; title: string } | null {
  if (!value || typeof value !== 'object') return null
  const doc = value as { slug?: unknown; title?: unknown }
  const slug = typeof doc.slug === 'string' ? doc.slug.trim() : ''
  const title = typeof doc.title === 'string' ? doc.title.trim() : ''
  if (!slug || !title) return null
  return { slug, title }
}

function resolveTaxonomy(
  target: FilterLinkTarget,
  block: FilterLinkBlockData,
): { slug: string; title: string } | null {
  if (target === 'workshopy-audience') return taxonomyDoc(block.audience)
  if (target === 'publikace-type') return taxonomyDoc(block.publicationType)
  return taxonomyDoc(block.tag)
}

/**
 * Pill button: filter icon + collection | tag → filtered listing.
 */
export function FilterLinkBlockView({
  block,
  siteSlug = '',
}: {
  block: FilterLinkBlockData
  siteSlug?: string
}) {
  const target =
    typeof block.target === 'string' && block.target in TARGET_META
      ? (block.target as FilterLinkTarget)
      : null
  if (!target) return null

  const meta = TARGET_META[target]
  const tax = resolveTaxonomy(target, block)
  if (!tax) return null

  const href = hrefWith(meta.path, {}, { [meta.param]: tax.slug }, siteSlug)
  const label = `${meta.collectionLabel}: ${tax.title}`

  return (
    <Link
      aria-label={label}
      className="not-prose inline-flex max-w-full items-stretch overflow-hidden rounded-full border-2 border-ground bg-transparent font-saans text-[16px] leading-tight text-ground no-underline transition-colors duration-150 ease-out hover:bg-ground hover:text-sky focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ground active:bg-ground active:text-sky"
      data-block="filterLink"
      href={href}
    >
      <span className="flex min-w-0 items-center gap-2 px-[15px] py-1">
        <FilterIcon className="size-4 shrink-0" />
        <span className="min-w-0 truncate whitespace-nowrap">{meta.collectionLabel}</span>
      </span>
      <span aria-hidden className="w-0.5 shrink-0 self-stretch bg-current" />
      <span className="flex min-w-0 items-center px-[15px] py-1">
        <span className="min-w-0 truncate whitespace-nowrap">{tax.title}</span>
      </span>
    </Link>
  )
}

import { Fragment } from 'react'

import type { Aktuality, Kalendar, Media, Projekty } from '@/payload-types'
import { EventCard, NewsCard, PageIntro, ProjectRow } from '@/components/frontend/cards'
import { GalleryBlock } from '@/components/frontend/GalleryBlock'
import { LogoStrip, resolveLogoStripItems } from '@/components/frontend/LogoStrip'
import { EmptyState } from '@/components/frontend/listing'
import { NazemiRichText } from '@/components/frontend/NazemiRichText'
import { BlockHeader, Button } from '@/components/frontend/ui'
import { resolveBlockActions } from '@/lib/block-actions'
import { isColorToken, resolveColor } from '@/lib/colors'
import { mediaAlt, mediaFocalStyle, mediaSizeURL } from '@/lib/content'
import { resolveGalleryImages } from '@/lib/gallery'

export const BG: Record<string, string> = {
  sky: 'bg-sky',
  green: 'bg-green',
  violet: 'bg-violet',
  orange: 'bg-orange',
  turquoise: 'bg-turquoise',
  blue: 'bg-blue',
  nerust: 'bg-nerust',
  pink: 'bg-pink',
  brown: 'bg-brown',
  gray: 'bg-gray',
}

export function bgClass(token?: string | null, fallback = 'bg-violet') {
  if (!token) return fallback
  return BG[token] || fallback
}

export type ContentBlock = {
  blockType: string
  id?: string
  [key: string]: unknown
}

export { HeroBackdrop } from '@/components/frontend/HeroBackdrop'

export function HeroBlock({
  block,
  narrow = false,
  siteSlug,
}: {
  block: ContentBlock
  /** Sub-sites: match article prose column width (desktop). */
  narrow?: boolean
  siteSlug?: string
}) {
  const segments = (block.segments as { text?: string; underline?: string }[]) || []
  const subheadline = block.subheadline as string | undefined
  const actions = resolveBlockActions({
    actions: block.actions as never,
    siteSlug: siteSlug || '',
  })

  return (
    <section
      className="relative py-12 sm:py-16 md:py-20 lg:py-24 xl:py-[100px] 2xl:py-[117px]"
      data-block="hero"
      data-component="hero"
    >
      <div
        className={`flex flex-col items-center gap-8 text-center lg:gap-content${
          narrow ? ' mx-auto w-full max-w-[874px]' : ''
        }`}
      >
        <h1 className="font-saans max-w-full text-balance text-5xl leading-none tracking-tight text-ground lg:text-6xl xl:text-7xl 2xl:text-[83px] 2xl:leading-[80px] 2xl:tracking-[-1.4px]">
          {segments.map((segment, index) => {
            const underlineToken =
              segment.underline && segment.underline !== 'none' ? segment.underline : null
            const color = resolveColor(underlineToken)
            const tokenClass =
              underlineToken && isColorToken(underlineToken)
                ? `hero-underline-${underlineToken}`
                : undefined
            return (
              <span
                className={tokenClass || (color ? 'hero-underline-custom' : undefined)}
                key={`${segment.text}-${index}`}
                style={
                  color && !tokenClass
                    ? { textDecorationColor: color, textDecorationLine: 'underline', textDecorationThickness: '8%' }
                    : undefined
                }
              >
                {(segment.text || '').split('\n').map((line, lineIndex) => (
                  <Fragment key={`${line}-${lineIndex}`}>
                    {lineIndex > 0 ? <br /> : null}
                    {line}
                  </Fragment>
                ))}
              </span>
            )
          })}
        </h1>
        {subheadline ? (
          <p className="font-saans max-w-full text-balance text-xl leading-tight tracking-tight text-ground lg:text-2xl xl:text-2xl 2xl:text-3xl">
            {subheadline}
          </p>
        ) : null}
        {actions.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {actions.map((action, index) =>
              action.label ? (
                <Button
                  backgroundColor={action.backgroundColor}
                  className="px-6 py-1.5 ![font-size:var(--text-section-title)] leading-none"
                  external={action.external}
                  href={action.href || '#'}
                  key={`${action.label}-${index}`}
                  newTab={action.newTab}
                  variant={action.variant || 'outline'}
                >
                  {action.label}
                </Button>
              ) : null,
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function EventsGrid({
  actions,
  items,
  siteSlug,
  title,
}: {
  actions: ReturnType<typeof resolveBlockActions>
  items: Kalendar[]
  siteSlug: string
  title: string
}) {
  return (
    <section className="flex flex-col" data-block="events">
      <BlockHeader actions={actions} title={title} />
      <div className="grid grid-cols-1 items-stretch gap-grid md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <EventCard item={item} key={item.id} siteSlug={siteSlug} />
        ))}
      </div>
      {items.length ? null : <EmptyState>Zatím nemáme naplánované žádné události.</EmptyState>}
    </section>
  )
}

export function NewsGrid({
  actions,
  items,
  siteSlug,
  title,
}: {
  actions: ReturnType<typeof resolveBlockActions>
  items: Aktuality[]
  siteSlug: string
  title: string
}) {
  return (
    <section className="flex flex-col" data-block="news">
      <BlockHeader actions={actions} title={title} />
      <div className="grid min-w-0 grid-cols-1 items-stretch gap-grid lg:grid-cols-2">
        {items.map((item) => (
          <NewsCard item={item} key={item.id} siteSlug={siteSlug} />
        ))}
      </div>
      {items.length ? null : <EmptyState>Zatím nemáme žádné aktuality.</EmptyState>}
    </section>
  )
}

export function ProjectsBlock({ block, siteSlug }: { block: ContentBlock; siteSlug: string }) {
  const items = Array.isArray(block.items)
    ? block.items.filter((item): item is Projekty => typeof item === 'object' && item !== null)
    : []
  const actions = resolveBlockActions({
    actionHref: block.actionHref as string | undefined,
    actionLabel: block.actionLabel as string | undefined,
    actions: block.actions as never,
    siteSlug,
  })

  return (
    <section className="flex flex-col" data-block="projects">
      <BlockHeader
        actions={actions}
        title={(block.title as string) || 'Naše projekty'}
      />
      <div className="flex flex-col gap-grid">
        {items.map((item) => (
          <ProjectRow item={item} key={item.id} siteSlug={siteSlug} />
        ))}
      </div>
      {items.length ? null : <EmptyState>Zatím nemáme žádné projekty.</EmptyState>}
    </section>
  )
}

type ColumnCtaRow = {
  actions?:
    | {
        backgroundColor?: string | null
        href?: string | null
        label?: string | null
        variant?: string | null
      }[]
    | null
}

function ColumnCta({ column, siteSlug }: { column: ColumnCtaRow; siteSlug: string }) {
  const action = resolveBlockActions({
    actions: column.actions as never,
    siteSlug,
  })[0]
  if (!action?.label) return null
  return (
    <Button
      backgroundColor={action.backgroundColor}
      className="mt-auto self-start"
      external={action.external}
      href={action.href || '#'}
      newTab={action.newTab}
      variant={action.variant || 'outline'}
    >
      {action.label}
    </Button>
  )
}

/**
 * Sloupce layout: fixed third-width cells, max 3 per row, wrap.
 * Exactly 4 columns → 2 per row (2+2), not 3+1.
 * Do NOT put `h-full` on cells — % height fights flex stretch when the row
 * height is content-sized, so `mt-auto` on ColumnCta has no free space.
 * Short rows (<3) centered (`lg:justify-center`).
 */
const COLUMNS_PER_ROW = 3
const COLUMNS_ROW =
  'flex flex-col gap-grid lg:flex-row lg:items-stretch lg:justify-center'
const COLUMNS_CELL =
  'flex w-full min-w-0 flex-col lg:w-[calc((100%-2*var(--spacing-grid))/3)] lg:shrink-0'

/** Desktop: pad title so its left edge matches the first column when the row is centered. */
function columnsTitleAlignClass(firstRowCount: number): string {
  if (firstRowCount >= COLUMNS_PER_ROW) return ''
  // cell = (100% - 2g) / 3
  if (firstRowCount === 1) {
    return 'lg:ps-[calc((100%-(100%-2*var(--spacing-grid))/3)/2)]'
  }
  // 2 cols: (100% - 2*cell - g) / 2
  return 'lg:ps-[calc((100%-2*((100%-2*var(--spacing-grid))/3)-var(--spacing-grid))/2)]'
}

function chunkColumns<T>(items: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size))
  }
  return rows
}

type ColumnRow = {
  image?: number | Media | null
  body?: unknown
  actions?: ColumnCtaRow['actions']
}

function ColumnImage({
  image,
  bordered = false,
}: {
  image?: number | Media | null
  bordered?: boolean
}) {
  const media = image && typeof image === 'object' ? image : null
  const src = media ? mediaSizeURL(media, 'landscape') : null
  if (!media || !src) return null
  return (
    <div
      className={`relative aspect-4/3 w-full shrink-0 overflow-hidden bg-ground${bordered ? ' border-b-2 border-ground' : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={mediaAlt(media)}
        className="size-full object-cover"
        loading="lazy"
        src={src}
        style={mediaFocalStyle(media)}
      />
    </div>
  )
}

type ColumnsStyle = 'clean' | 'bordered' | 'table'

function resolveColumnsStyle(block: ContentBlock): ColumnsStyle {
  const raw = block.style
  if (raw === 'bordered' || raw === 'table' || raw === 'clean') return raw
  // Legacy checkbox → select (pre-migrate API payloads).
  if (block.borders === true) return 'bordered'
  return 'clean'
}

/** Sloupce (`threeColumns`) — style: clean | bordered | table. */
export function ColumnsBlock({
  block,
  siteSlug,
}: {
  block: ContentBlock
  siteSlug: string
}) {
  const style = resolveColumnsStyle(block)
  const columns = (block.columns as ColumnRow[]) || []
  if (!columns.length) return null

  // Exactly 4 → 2/row (2+2); else max 3/row.
  const perRow = columns.length === 4 ? 2 : COLUMNS_PER_ROW
  const rows = chunkColumns(columns, perRow)
  const isTable = style === 'table'
  const isFramed = style === 'bordered' || isTable
  const titleAlign = isTable ? '' : columnsTitleAlignClass(rows[0]?.length || 0)

  const renderColumn = (column: ColumnRow, index: number) => {
    const body = column.body ? (
      <div className="prose-nazemi text-body-inter text-ground">
        <NazemiRichText data={column.body as never} siteSlug={siteSlug} />
      </div>
    ) : null

    if (isFramed) {
      // Table: no per-cell border — shared 2px dividers via gap+[bg-ground] parent.
      const cellClass = isTable
        ? 'flex min-w-0 flex-1 flex-col overflow-hidden bg-sky'
        : `${COLUMNS_CELL} overflow-hidden border-2 border-ground bg-sky`
      return (
        <article
          className={cellClass}
          data-component="column-card"
          key={`col-${index}`}
        >
          {/* Image flush to card edges; bottom border separates from body. */}
          <ColumnImage bordered image={column.image} />
          <div className="flex min-h-0 flex-1 flex-col gap-6 p-card">
            {body}
            <ColumnCta column={column} siteSlug={siteSlug} />
          </div>
        </article>
      )
    }

    return (
      <div className={`${COLUMNS_CELL} gap-card`} data-component="column" key={`col-${index}`}>
        <ColumnImage image={column.image} />
        {body}
        <ColumnCta column={column} siteSlug={siteSlug} />
      </div>
    )
  }

  const rowClass = isTable
    ? 'flex flex-col gap-[2px] bg-ground lg:flex-row lg:items-stretch'
    : COLUMNS_ROW

  return (
    <section
      className="flex flex-col gap-grid"
      data-block="threeColumns"
      data-cols={columns.length}
      data-style={style}
    >
      <BlockHeader
        className={titleAlign}
        title={(block.title as string) || undefined}
      />
      {isTable ? (
        <div
          className="flex flex-col gap-[2px] overflow-hidden border-2 border-ground bg-ground"
          data-component="columns-table"
        >
          {rows.map((row, rowIndex) => (
            <div className={rowClass} data-row={rowIndex} key={`row-${rowIndex}`}>
              {row.map((column, colIndex) =>
                renderColumn(column, rowIndex * perRow + colIndex),
              )}
            </div>
          ))}
        </div>
      ) : (
        rows.map((row, rowIndex) => (
          <div className={rowClass} data-row={rowIndex} key={`row-${rowIndex}`}>
            {row.map((column, colIndex) =>
              renderColumn(column, rowIndex * perRow + colIndex),
            )}
          </div>
        ))
      )}
    </section>
  )
}

/** @deprecated Prefer ColumnsBlock — same renderer. */
export const ThreeColumnsBlock = ColumnsBlock

export function AboutBlock({ block, siteSlug }: { block: ContentBlock; siteSlug: string }) {
  const image = block.image && typeof block.image === 'object' ? (block.image as Media) : null
  const imageUrl = image ? mediaSizeURL(image, 'large') : null
  const columns = ((block.columns as { title?: string; body?: string }[]) || []).slice(0, 3)
  const colCount = Math.max(columns.length, 1)
  const gridCols =
    colCount >= 3 ? 'lg:grid-cols-3' : colCount === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
  const actions = resolveBlockActions({
    actionHref: block.actionHref as string | undefined,
    actionLabel: block.actionLabel as string | undefined,
    actions: block.actions as never,
    defaultHref: '/o-nazemi',
    defaultLabel: 'Číst o NaZemi',
    siteSlug,
  })

  return (
    <section data-block="about" data-component="about-block">
      <BlockHeader
        actions={actions}
        title={(block.title as string) || 'NaZemi'}
      />
      {imageUrl ? (
        <div className="overflow-hidden border-x-2 border-t-2 border-x-ground border-t-ground">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={mediaAlt(image, 'Tým NaZemi')}
            className="block h-auto w-full"
            loading="lazy"
            src={imageUrl}
          />
        </div>
      ) : null}
      <div
        className={`grid w-full grid-cols-1 border-x-2 border-b-2 border-t-2 border-x-ground border-b-ground border-t-ground bg-sky ${gridCols}`}
      >
        {columns.map((column, index) => (
          <div
            className="flex min-w-0 flex-1 flex-col p-card"
            data-component="about-column"
            key={`${column.title}-${index}`}
          >
            <div className="flex flex-col gap-2.5">
              <h3 className="text-card-title text-ground">{column.title}</h3>
              <p className="text-body-inter text-ground">{column.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

type SpeakersPeople = { name?: string; role?: string; image?: unknown; quote?: string }[]
type TestimonialItems = { quote?: string; author?: string; role?: string }[]

/**
 * Lidé / Reference layout:
 * - Off homepage (`fullWidth` false): always prose column (`max-w-[874px]`), centered.
 * - Homepage (`fullWidth` true): no prose cap — same full width as other homepage blocks.
 * - `bare`: skip outer `.container` when parent already wraps (HomepageBlocks).
 */
export function SpeakersBlockView({
  block,
  bare = false,
  fullWidth = false,
}: {
  block: ContentBlock
  bare?: boolean
  fullWidth?: boolean
}) {
  const people = (block.people as SpeakersPeople) || []
  if (!people.length) return null
  const title =
    typeof block.title === 'string' && block.title.trim() ? block.title : 'Lidé'
  // 1: lg 3-col track so single card doesn’t stretch. 2+: same sm:2 as 3+ so a pair
  // stays on one row whenever a 3-entry block still shows two across.
  const gridClass =
    people.length === 1
      ? 'grid grid-cols-1 gap-grid lg:grid-cols-3'
      : 'grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-3'
  const section = (
    <section
      className={`flex flex-col gap-grid${fullWidth ? '' : ' mx-auto w-full max-w-[874px]'}`}
      data-block="workshop-speakers"
      data-count={people.length}
      data-layout={fullWidth ? 'full' : 'prose'}
    >
      <h2 className="text-section-title text-ground">{title}</h2>
      <div className={gridClass}>
        {people.map((person, personIndex) => {
          const img =
            person.image && typeof person.image === 'object' ? (person.image as Media) : null
          const imgUrl = img ? mediaSizeURL(img, 'thumb') : null
          const initials = (person.name || '')
            .split(/\s+/)
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
          const quote =
            typeof person.quote === 'string' && person.quote.trim() ? person.quote.trim() : null
          return (
            <article
              className="flex flex-col gap-3"
              data-component="workshop-speaker"
              key={`${person.name}-${personIndex}`}
            >
              {quote ? (
                <p className="font-serif text-xl font-normal leading-snug tracking-tight text-ground">
                  „{quote}“
                </p>
              ) : null}
              <div className="flex gap-4">
                {imgUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={mediaAlt(img, person.name || '')}
                    className="size-20 shrink-0 rounded-full border-2 border-ground object-cover"
                    loading="lazy"
                    src={imgUrl}
                    style={mediaFocalStyle(img)}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-ground bg-green font-saans text-xl leading-none text-ground"
                  >
                    {initials}
                  </div>
                )}
                <div className="flex min-w-0 flex-col justify-center gap-1">
                  <h3 className="text-card-title text-ground">{person.name}</h3>
                  {person.role ? <p className="text-body-inter text-ground">{person.role}</p> : null}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
  if (bare) return section
  return <div className="container max-lg:px-card">{section}</div>
}

export function TestimonialsBlockView({
  block,
  bare = false,
  fullWidth = false,
}: {
  block: ContentBlock
  bare?: boolean
  fullWidth?: boolean
}) {
  const items = (block.items as TestimonialItems) || []
  if (!items.length) return null
  const title =
    typeof block.title === 'string' && block.title.trim()
      ? block.title
      : 'Co o workshopu říkají'
  // Quotes stretch within available width. Homepage 3+: up to 4 cols; prose stays ≤2.
  const n = items.length
  const gridClass =
    n === 1
      ? 'grid min-w-0 grid-cols-1 gap-grid'
      : n === 2
        ? 'grid min-w-0 grid-cols-1 gap-grid lg:grid-cols-2 lg:gap-10'
        : fullWidth
          ? 'grid min-w-0 grid-cols-1 gap-grid lg:grid-cols-2 lg:gap-10 xl:grid-cols-4'
          : 'grid min-w-0 grid-cols-1 gap-grid lg:grid-cols-2 lg:gap-10'
  const section = (
    <section
      className={`flex flex-col gap-grid${fullWidth ? '' : ' mx-auto w-full max-w-[874px]'}`}
      data-block="workshop-testimonials"
      data-count={items.length}
      data-layout={fullWidth ? 'full' : 'prose'}
    >
      <h2 className="text-section-title text-ground">{title}</h2>
      <div className={gridClass}>
        {items.map((item, itemIndex) => (
          <blockquote
            className="flex h-full flex-col gap-3 text-ground"
            data-component="workshop-testimonial"
            key={`${item.author}-${itemIndex}`}
          >
            <p className="font-serif text-xl font-normal leading-snug tracking-tight text-ground">
              „{item.quote}“
            </p>
            <footer className="font-saans mt-auto text-sm leading-snug text-ground/70">
              <cite className="not-italic">
                {item.author}
                {item.role ? ` · ${item.role}` : ''}
              </cite>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  )
  if (bare) return section
  return <div className="container max-lg:px-card">{section}</div>
}

export function PageBlocks({
  blocks,
  siteSlug = '',
  skipPageIntro = false,
}: {
  blocks?: ContentBlock[] | null
  siteSlug?: string
  /** When page fields already render PageIntro (design generic-page). */
  skipPageIntro?: boolean
}) {
  if (!blocks?.length) return null

  return (
    <div className="flex flex-col gap-content">
      {blocks.map((block, index) => {
        const key = block.id || `${block.blockType}-${index}`

        if (block.blockType === 'pageIntro') {
          if (skipPageIntro) return null
          const cover =
            block.coverImage && typeof block.coverImage === 'object'
              ? (block.coverImage as Media)
              : null
          const coverUrl = cover ? mediaSizeURL(cover, 'hero') : null
          if (!block.lead && !coverUrl) return null
          return (
            <PageIntro
              color={(block.headerColor as string) || null}
              coverAlt={mediaAlt(cover, '')}
              coverStyle={mediaFocalStyle(cover)}
              coverUrl={coverUrl}
              description={block.lead ? String(block.lead) : null}
              key={key}
            />
          )
        }

        if (block.blockType === 'speakers') {
          return <SpeakersBlockView block={block} key={key} />
        }

        if (block.blockType === 'testimonials') {
          return <TestimonialsBlockView block={block} key={key} />
        }

        if (block.blockType === 'gallery') {
          return (
            <div className="container max-lg:px-card" key={key}>
              <GalleryBlock
                caption={block.caption ? String(block.caption) : null}
                columns={(block.columns as '1' | '2' | '3' | null) || '2'}
                images={resolveGalleryImages(block.images)}
              />
            </div>
          )
        }

        if (block.blockType === 'logoStrip') {
          return (
            <div className="container max-lg:px-card" key={key}>
              <LogoStrip
                logos={resolveLogoStripItems(block)}
                title={block.title ? String(block.title) : null}
              />
            </div>
          )
        }

        if (block.blockType === 'richText' && block.content) {
          return (
            <div className="container max-lg:px-card" key={key}>
              <div className="prose-nazemi mx-auto w-full max-w-[874px]">
                <NazemiRichText data={block.content as never} siteSlug={siteSlug} />
              </div>
            </div>
          )
        }

        if (block.blockType === 'threeColumns') {
          return (
            <div className="container max-lg:px-card" key={key}>
              <ColumnsBlock block={block} siteSlug={siteSlug} />
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

export function WorkshopContentBlocks({
  blocks,
  siteSlug = '',
}: {
  blocks?: ContentBlock[] | null
  siteSlug?: string
}) {
  // Design always emits workshop-body with pt-content-top (even when empty).
  const ordered = blocks?.length
    ? [...blocks].sort((a, b) => {
        const rank = (type: string) =>
          type === 'speakers' ? 0 : type === 'testimonials' ? 1 : type === 'richText' ? 2 : 3
        return rank(a.blockType) - rank(b.blockType)
      })
    : []

  return (
    <div className="flex flex-col gap-section pt-section" data-component="workshop-body">
      {ordered.map((block, index) => {
        const key = block.id || `${block.blockType}-${index}`

        if (block.blockType === 'speakers') {
          return <SpeakersBlockView block={block} key={key} />
        }

        if (block.blockType === 'testimonials') {
          return <TestimonialsBlockView block={block} key={key} />
        }

        if (block.blockType === 'gallery') {
          return (
            <div className="container max-lg:px-card" key={key}>
              <GalleryBlock
                caption={block.caption ? String(block.caption) : null}
                columns={(block.columns as '1' | '2' | '3' | null) || '2'}
                images={resolveGalleryImages(block.images)}
              />
            </div>
          )
        }

        if (block.blockType === 'logoStrip') {
          return (
            <div className="container max-lg:px-card" key={key}>
              <LogoStrip
                logos={resolveLogoStripItems(block)}
                title={block.title ? String(block.title) : null}
              />
            </div>
          )
        }

        if (block.blockType === 'richText' && block.content) {
          return (
            <div className="container max-lg:px-card" key={key}>
              <div className="prose-nazemi mx-auto w-full max-w-[874px]">
                <NazemiRichText data={block.content as never} siteSlug={siteSlug} />
              </div>
            </div>
          )
        }

        if (block.blockType === 'threeColumns') {
          return (
            <div className="container max-lg:px-card" key={key}>
              <ColumnsBlock block={block} siteSlug={siteSlug} />
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
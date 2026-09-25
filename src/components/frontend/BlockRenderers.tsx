import { Fragment } from 'react'

import type { Aktuality, Kalendar, Media, Projekty } from '@/payload-types'
import { EventCard, NewsCard, PageIntro, ProjectRow } from '@/components/frontend/cards'
import { GalleryBlock } from '@/components/frontend/GalleryBlock'
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
          <p className="font-saans max-w-full text-balance text-2xl leading-snug tracking-tight text-ground lg:text-3xl xl:text-3xl 2xl:text-4xl">
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

export function ThreeColumnsBlock({
  block,
  siteSlug,
}: {
  block: ContentBlock
  siteSlug: string
}) {
  const columns = (
    (block.columns as {
      body?: unknown
      headline?: string | null
      title?: string | null
      actions?: ColumnCtaRow['actions']
    }[]) || []
  ).slice(0, 3)

  if (!columns.length) return null

  return (
    <section className="flex flex-col" data-block="threeColumns">
      <BlockHeader title={(block.title as string) || undefined} />
      <div className="grid grid-cols-1 items-stretch gap-grid lg:grid-cols-3">
        {columns.map((column, index) => {
          const headline = column.headline?.trim()
          const title = column.title?.trim()
          return (
            <div
              className="flex h-full min-w-0 flex-col gap-card"
              data-component="three-column"
              key={`${title || headline || 'col'}-${index}`}
            >
              {headline || title ? (
                <h3 className="font-saans text-5xl leading-none tracking-tight text-ground lg:text-[74px] lg:leading-[70px] lg:tracking-[-1.48px]">
                  {headline ? <span className="block text-green">{headline}</span> : null}
                  {title ? <span className="block">{title}</span> : null}
                </h3>
              ) : null}
              {column.body ? (
                <div className="prose-nazemi text-body-inter text-ground">
                  <NazemiRichText data={column.body as never} siteSlug={siteSlug} />
                </div>
              ) : null}
              <ColumnCta column={column} siteSlug={siteSlug} />
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function ThreeCardsBlock({
  block,
  siteSlug,
}: {
  block: ContentBlock
  siteSlug: string
}) {
  const columns = (
    (block.columns as {
      body?: unknown
      prefix?: string | null
      title?: string | null
      actions?: ColumnCtaRow['actions']
    }[]) || []
  ).slice(0, 3)

  if (!columns.length) return null

  return (
    <section className="flex flex-col" data-block="threeCards">
      <BlockHeader title={(block.title as string) || undefined} />
      <div className="grid grid-cols-1 items-stretch gap-grid lg:grid-cols-3">
        {columns.map((column, index) => {
          const prefix = column.prefix?.trim()
          const title = column.title?.trim()
          return (
            <article
              className="flex h-full min-w-0 flex-col border-2 border-ground bg-sky"
              data-component="three-card"
              key={`${title || prefix || 'card'}-${index}`}
            >
              <div className="flex h-full flex-1 flex-col justify-between gap-6 p-card">
                <div className="flex flex-col gap-2.5">
                  {prefix || title ? (
                    <h3 className="text-display text-ground">
                      {prefix ? <span className="block text-green">{prefix}</span> : null}
                      {title ? <span className="block">{title}</span> : null}
                    </h3>
                  ) : null}
                  {column.body ? (
                    <div className="prose-nazemi text-body-inter text-ground">
                      <NazemiRichText data={column.body as never} siteSlug={siteSlug} />
                    </div>
                  ) : null}
                </div>
                <ColumnCta column={column} siteSlug={siteSlug} />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

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
              <ThreeColumnsBlock block={block} siteSlug={siteSlug} />
            </div>
          )
        }

        if (block.blockType === 'threeCards') {
          return (
            <div className="container max-lg:px-card" key={key}>
              <ThreeCardsBlock block={block} siteSlug={siteSlug} />
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
          const people = (block.people as { name?: string; role?: string; image?: unknown }[]) || []
          if (!people.length) return null
          const title =
            typeof block.title === 'string' && block.title.trim()
              ? block.title
              : 'Lektoři a facilitátoři'
          return (
            <div className="container max-lg:px-card" key={key}>
              <section className="flex flex-col gap-grid" data-block="workshop-speakers">
                <h2 className="text-section-title text-ground">{title}</h2>
                <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-3">
                  {people.map((person, personIndex) => {
                    const img =
                      person.image && typeof person.image === 'object'
                        ? (person.image as Media)
                        : null
                    const imgUrl = img ? mediaSizeURL(img, 'thumb') : null
                    const initials = (person.name || '')
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                    return (
                      <article
                        className="flex gap-4"
                        data-component="workshop-speaker"
                        key={`${person.name}-${personIndex}`}
                      >
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
                          {person.role ? (
                            <p className="text-body-inter text-ground">{person.role}</p>
                          ) : null}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            </div>
          )
        }

        if (block.blockType === 'testimonials') {
          const items = (block.items as { quote?: string; author?: string; role?: string }[]) || []
          if (!items.length) return null
          const title =
            typeof block.title === 'string' && block.title.trim()
              ? block.title
              : 'Co o workshopu říkají'
          return (
            <div className="container max-lg:px-card" key={key}>
              <section className="flex flex-col gap-grid" data-block="workshop-testimonials">
                <h2 className="text-section-title text-ground">{title}</h2>
                <div className="grid min-w-0 grid-cols-1 gap-grid lg:grid-cols-2 lg:gap-10 xl:grid-cols-4">
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
            </div>
          )
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
              <ThreeColumnsBlock block={block} siteSlug={siteSlug} />
            </div>
          )
        }

        if (block.blockType === 'threeCards') {
          return (
            <div className="container max-lg:px-card" key={key}>
              <ThreeCardsBlock block={block} siteSlug={siteSlug} />
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
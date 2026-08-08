import type { ReactNode } from 'react'

import type { Aktuality, Kalendar, Projekty, Publikace, Workshopy } from '@/payload-types'

import { EventOverviewMotion } from '@/components/frontend/EventOverviewMotion'
import { PageBlocks } from '@/components/frontend/BlockRenderers'
import { CalendarIcon, ClockIcon, PinIcon } from '@/components/frontend/icons'
import { NazemiRichText } from '@/components/frontend/NazemiRichText'
import { Button, TagGroup } from '@/components/frontend/ui'
import { WorkshopHeaderMotion } from '@/components/frontend/WorkshopHeaderMotion'
import { crossPostSiteName, mediaAlt, withSiteQuery } from '@/lib/content'
import { formatDate, formatDateRange, formatTimeRange } from '@/lib/format'

/** Full-bleed container + 874px prose column — matches the design content rhythm. */
export const CONTENT_WRAPPER_CLASS = 'container max-lg:px-card'
export const CONTENT_INNER_CLASS = 'mx-auto w-full max-w-[874px]'

function tagTitles(items?: (number | { title?: string | null })[] | null) {
  if (!items?.length) return []
  return items
    .filter((item): item is { title?: string | null } => typeof item === 'object' && item !== null)
    .map((item) => item.title || '')
}

export function ContentColumn({ children }: { children: ReactNode }) {
  return (
    <div className={CONTENT_WRAPPER_CLASS}>
      <div className={CONTENT_INNER_CLASS}>{children}</div>
    </div>
  )
}

export function Prose({ data }: { data?: unknown }) {
  if (!data) return null

  return (
    <div className={CONTENT_WRAPPER_CLASS}>
      <div
        className={`prose-nazemi ${CONTENT_INNER_CLASS} font-inter`}
        data-block="event-content"
        data-component="event-prose"
      >
        <NazemiRichText data={data as never} />
      </div>
    </div>
  )
}

const META_ICON_CLASS =
  'inline-flex size-[1.125rem] shrink-0 items-center justify-center opacity-50 lg:size-[22px] [&_svg]:block [&_svg]:size-full'
const META_TEXT_CLASS =
  'font-saans text-lg leading-none tracking-[-0.36px] lg:text-[22px] lg:tracking-[-0.44px]'

function EventMeta({
  href,
  icon,
  text,
}: {
  href?: string | null
  icon: ReactNode
  text?: string | null
}) {
  if (!text) return null

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden="true" className={`${META_ICON_CLASS} text-sky`}>
        {icon}
      </span>
      {href ? (
        <a
          className={`truncate ${META_TEXT_CLASS} text-sky underline underline-offset-2`}
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {text}
        </a>
      ) : (
        <span className={`${META_TEXT_CLASS} whitespace-nowrap text-sky`}>{text}</span>
      )}
    </div>
  )
}

export function EventOverview({ item, siteSlug }: { item: Kalendar; siteSlug: string }) {
  const cover = item.coverImage && typeof item.coverImage === 'object' ? item.coverImage : null
  const origin = crossPostSiteName({
    currentSiteSlug: siteSlug,
    docSite: item.site,
  })
  const address = item.location?.address || null
  const placeText = address || [item.location?.name, item.location?.city].filter(Boolean).join(', ')
  const primaryCta = item.ctas?.find((cta) => cta.url && cta.title)

  const dateMeta = (
    <EventMeta icon={<CalendarIcon />} text={formatDateRange(item.startDate, item.endDate)} />
  )
  const timeMeta = <EventMeta icon={<ClockIcon />} text={formatTimeRange(item.startDate, item.endDate)} />
  const placeMeta = (
    <EventMeta href={item.location?.mapsLink} icon={<PinIcon />} text={placeText} />
  )
  const signup = primaryCta ? (
    <Button
      className="shrink-0"
      external
      href={primaryCta.url!}
      variant="filled-green"
    >
      {primaryCta.title}
    </Button>
  ) : null
  const stickySignup = primaryCta ? (
    <Button
      className="shrink-0 self-start lg:self-center"
      external
      href={primaryCta.url!}
      variant="filled-green"
    >
      {primaryCta.title}
    </Button>
  ) : null

  return (
    <EventOverviewMotion>
      <div data-block="event-overview" data-component="event-overview">
        <section aria-label="Přehled události" className="container" data-event-overview-hero>
          <div className="flex flex-col border-x-2 border-b-2 border-solid border-ground lg:flex-row lg:items-stretch">
            <div className="event-overview-media">
              {cover?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={mediaAlt(cover, item.title)} src={cover.url} />
              ) : null}
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-ground p-card">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2.5">
                  <h1 className="text-display text-sky lg:max-w-[583px]">{item.title}</h1>
                  <TagGroup
                    tagClassName="text-[10px] lg:text-tag"
                    tags={[...tagTitles(item.tags), origin]}
                    variant="sky"
                  />
                  <div className="mt-3 flex flex-col gap-4 lg:mt-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-[30px] lg:gap-y-2">
                    {dateMeta}
                    {timeMeta}
                    {placeMeta}
                  </div>
                </div>
                {signup}
              </div>
            </div>
          </div>
        </section>

        <div
          aria-hidden="true"
          aria-label="Přehled události"
          className="event-overview-sticky"
          data-event-overview-sticky
        >
          <div className="bg-ground">
            <div className="container py-card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
                <p className="min-w-0 line-clamp-2 font-saans text-xl leading-snug tracking-[-0.4px] text-sky lg:max-w-[30%] lg:shrink-0 lg:text-[30px] lg:leading-tight lg:tracking-[-0.6px]">
                  {item.title}
                </p>
                <div className="hidden min-w-0 shrink flex-1 flex-col items-start justify-center gap-y-2 lg:flex">
                  <div className="flex items-center gap-x-[30px]">
                    {dateMeta}
                    {timeMeta}
                  </div>
                  {placeMeta}
                </div>
                {stickySignup}
              </div>
            </div>
          </div>
        </div>
      </div>
    </EventOverviewMotion>
  )
}

export function EventBody({ item, siteSlug }: { item: Kalendar; siteSlug: string }) {
  const workshop = item.workshop && typeof item.workshop === 'object' ? item.workshop : null

  return (
    <div className="flex flex-col gap-content">
      <Prose data={item.content} />

      {workshop?.slug ? (
        <ContentColumn>
          <Button
            href={withSiteQuery(`/workshopy/${workshop.slug}`, siteSlug)}
            variant="outline-ground"
          >
            Více o workshopu {workshop.title}
          </Button>
        </ContentColumn>
      ) : null}
    </div>
  )
}

export function EventDetail({ item, siteSlug }: { item: Kalendar; siteSlug: string }) {
  return (
    <article>
      <EventOverview item={item} siteSlug={siteSlug} />
      <div className="pt-content-top">
        <EventBody item={item} siteSlug={siteSlug} />
      </div>
    </article>
  )
}

export function NewsArticleHero({ item }: { item: Aktuality }) {
  const cover = item.coverImage && typeof item.coverImage === 'object' ? item.coverImage : null
  if (!cover?.url || item.layout === 'small') return null

  return (
    <div
      aria-hidden="true"
      className="article-hero-big border-b-2 border-b-ground"
      data-component="news-article-hero"
      data-variant="big"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" className="size-full object-cover" src={cover.url} />
    </div>
  )
}

export function NewsArticle({
  item,
  siteSlug,
  skipBigHero = false,
  skipTopPad = false,
}: {
  item: Aktuality
  siteSlug: string
  /** When hero is rendered via SiteShell `beforeMain`. */
  skipBigHero?: boolean
  /** When top pad lives on `<main>` (`mainClassName`). */
  skipTopPad?: boolean
}) {
  const cover = item.coverImage && typeof item.coverImage === 'object' ? item.coverImage : null
  const author = item.author && typeof item.author === 'object' ? item.author : null
  const origin = crossPostSiteName({
    currentSiteSlug: siteSlug,
    docSite: item.site,
  })
  const small = item.layout === 'small'
  const byline = item.authorName || author?.name || null
  const meta = [
    formatDate(item.publishedAt),
    byline,
    origin ? `${item.externalUrl ? '↗ ' : ''}${origin}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article data-component="news-article" data-layout={small ? 'small' : 'big'}>
      {cover?.url && !small && !skipBigHero ? (
        <div
          aria-hidden="true"
          className="article-hero-big border-b-2 border-b-ground"
          data-component="news-article-hero"
          data-variant="big"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="size-full object-cover" src={cover.url} />
        </div>
      ) : null}

      <div className={`flex flex-col gap-content${skipTopPad ? '' : ' pt-16 lg:pt-24'}`}>
        <ContentColumn>
          <header className="flex w-full flex-col gap-grid" data-component="news-article-header">
            <h1 className="text-display text-balance">{item.title}</h1>
            <TagGroup tags={tagTitles(item.tags)} />
            {meta ? <p className="font-saans text-body text-ground/70">{meta}</p> : null}
          </header>
        </ContentColumn>

        {cover?.url && small ? (
          <div
            aria-hidden="true"
            className="article-hero-small mx-auto w-full max-w-[1094px] overflow-hidden border-2 border-ground"
            data-component="news-article-hero"
            data-variant="small"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="size-full object-cover" src={cover.url} />
          </div>
        ) : null}

        <Prose data={item.content} />
      </div>
    </article>
  )
}

function WorkshopSpec({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1 p-card" data-component="workshop-spec">
      <span className="font-saans text-body text-ground/70">{label}</span>
      <span className="font-saans text-section-title leading-none text-ground">{value || '\u00a0'}</span>
    </div>
  )
}

/** Compact spec for the sticky bar — label above value, event-meta rhythm. */
function WorkshopStickySpec({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null

  return (
    <div className="flex min-w-0 flex-col gap-0.5" data-component="workshop-sticky-spec">
      <span className="font-saans text-sm leading-none text-ground/70">{label}</span>
      <span className="font-saans text-lg leading-none tracking-[-0.36px] text-ground lg:text-[22px] lg:tracking-[-0.44px]">
        {value}
      </span>
    </div>
  )
}

export function WorkshopHeader({
  children,
  item,
  siteSlug,
}: {
  children?: ReactNode
  item: Workshopy
  siteSlug: string
}) {
  const cover = item.coverImage && typeof item.coverImage === 'object' ? item.coverImage : null
  const duration = typeof item.duration === 'string' && item.duration.trim() ? item.duration : null
  const price = typeof item.price === 'string' && item.price.trim() ? item.price : null
  const orderCta = item.ctas?.find((cta) => cta.url && cta.title)
  const audienceTags = tagTitles(item.audiences)
  const topicTags = tagTitles(item.topics)
  const hasTags = audienceTags.length > 0 || topicTags.length > 0

  const datesButton = (
    <Button href={withSiteQuery(`/kalendar?workshop=${item.slug}`, siteSlug)} variant="outline-ground">
      Aktuální termíny
    </Button>
  )
  const orderButton = orderCta ? (
    <Button external href={orderCta.url} variant="filled-green">
      {orderCta.title}
    </Button>
  ) : null

  return (
    <WorkshopHeaderMotion>
      <div data-block="workshop-header" data-component="workshop-header">
      <header aria-label="Přehled workshopu" className="container" data-workshop-header-hero>
        <div className="overflow-hidden border-x-2 border-b-2 border-solid border-ground bg-sky">
          <div className="relative">
            <div className="relative aspect-4/3 overflow-hidden bg-ground lg:absolute lg:inset-y-0 lg:left-0 lg:z-0 lg:aspect-auto lg:w-[min(42%,480px)]">
              {cover?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="absolute inset-0 size-full object-cover object-center" src={cover.url} />
              ) : null}
            </div>
            <div className="relative z-10 flex flex-col divide-y-2 divide-ground shadow-[inset_0_2px_0_0_var(--color-ground)] lg:ml-[min(42%,480px)] lg:shadow-[inset_2px_0_0_0_var(--color-ground)]">
              <section className="flex flex-col gap-grid p-card">
                {hasTags ? (
                  <div className="flex flex-wrap gap-tag" data-component="workshop-tags">
                    <TagGroup muted={false} tags={audienceTags} />
                    <TagGroup muted={false} tags={topicTags} />
                  </div>
                ) : null}
                <div className="flex flex-col gap-2.5">
                  <h1 className="text-display text-ground">{item.title}</h1>
                  {item.excerpt ? (
                    <p className="text-body-inter text-ground">{item.excerpt}</p>
                  ) : null}
                </div>
              </section>
              <section
                className="grid grid-cols-1 divide-y-2 divide-ground sm:grid-cols-3 sm:divide-x-2 sm:divide-y-0"
                data-component="workshop-specs"
              >
                <WorkshopSpec label="Délka" value={duration} />
                <WorkshopSpec label="Velikost skupiny" value={item.groupSize} />
                <WorkshopSpec label="Cena" value={price} />
              </section>
              {item.takeaways?.length ? (
                <section className="p-card">
                  <h2 className="text-section-title text-ground">Co si odnesete</h2>
                  <ul className="mt-2.5 flex list-disc flex-col gap-1.5 pl-5 marker:text-green">
                    {item.takeaways.map((row, index) => (
                      <li className="text-body-inter text-ground" key={row.id || `${row.item}-${index}`}>
                        {row.item}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <section className="flex flex-wrap items-center gap-3 p-card">
                {datesButton}
                {orderButton}
              </section>
            </div>
          </div>
        </div>
      </header>

      <div
        aria-hidden="true"
        aria-label="Přehled workshopu"
        className="event-overview-sticky"
        data-workshop-header-sticky
      >
        <div className="border-b-2 border-b-ground bg-sky">
          <div className="container py-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
              <p className="min-w-0 line-clamp-2 font-saans text-xl leading-snug tracking-[-0.4px] text-ground lg:max-w-[30%] lg:shrink-0 lg:text-[30px] lg:leading-tight lg:tracking-[-0.6px]">
                {item.title}
              </p>
              <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-[30px] gap-y-3">
                <WorkshopStickySpec label="Délka" value={duration} />
                <WorkshopStickySpec label="Velikost skupiny" value={item.groupSize} />
                <WorkshopStickySpec label="Cena" value={price} />
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 self-start lg:self-center">
                {datesButton}
                {orderButton}
              </div>
            </div>
          </div>
        </div>
      </div>
      {children}
      </div>
    </WorkshopHeaderMotion>
  )
}

export function PublicationHeader({ item }: { item: Publikace }) {
  const cover = item.coverImage && typeof item.coverImage === 'object' ? item.coverImage : null
  const typeTags = tagTitles(item.types)
  const topicTags = tagTitles(item.topics)
  const hasTags = typeTags.length > 0 || topicTags.length > 0
  const primaryCta = (item.ctas || []).find((c) => c.url && c.title)

  return (
    <header className="w-full" data-block="publication-header" data-component="publication-header">
      <ContentColumn>
        <div className="flex flex-col gap-grid lg:flex-row lg:items-start lg:gap-8">
          <div className="flex h-[min(280px,45vh)] w-full max-w-[200px] shrink-0 items-start justify-start sm:h-[min(220px,32vh)] sm:max-w-[140px] lg:h-[min(260px,35vh)] lg:max-w-[160px]">
            {cover?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={mediaAlt(cover, item.title)}
                className="max-h-full max-w-full object-contain object-left"
                src={cover.url}
              />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-grid">
            <section className="flex flex-col gap-grid">
              {hasTags ? (
                <div className="flex flex-wrap gap-tag" data-component="publication-tags">
                  <TagGroup muted={false} tags={typeTags} />
                  <TagGroup muted={false} tags={topicTags} />
                </div>
              ) : null}
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <h1 className="text-display text-ground">{item.title}</h1>
                  {item.authorName ? (
                    <p className="font-saans text-body text-ground/70">{item.authorName}</p>
                  ) : null}
                </div>
                {item.excerpt ? <p className="text-body-inter text-ground">{item.excerpt}</p> : null}
              </div>
            </section>
            {primaryCta ? (
              <section>
                <Button external={Boolean(primaryCta.url)} href={primaryCta.url || '#'} variant="filled-green">
                  {primaryCta.title}
                </Button>
              </section>
            ) : null}
          </div>
        </div>
      </ContentColumn>
    </header>
  )
}

export function PublicationBody({ item }: { item: Publikace }) {
  return (
    <div data-component="publication-body">
      <Prose data={item.content} />
    </div>
  )
}

export function PublicationDetail({ item }: { item: Publikace }) {
  return (
    <article>
      <PublicationHeader item={item} />
      <div className="pt-content-top">
        <PublicationBody item={item} />
      </div>
    </article>
  )
}

export function ProjectDetail({ item }: { item: Projekty }) {
  return <PageBlocks blocks={item.content as never} />
}

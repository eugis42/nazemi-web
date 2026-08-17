import type { ReactNode } from 'react'

import type { Aktuality, Kalendar, Projekty, Publikace, Workshopy } from '@/payload-types'

import { EventOverviewMotion } from '@/components/frontend/EventOverviewMotion'
import { PageBlocks } from '@/components/frontend/BlockRenderers'
import { CalendarIcon, ClockIcon, PinIcon } from '@/components/frontend/icons'
import { NazemiRichText } from '@/components/frontend/NazemiRichText'
import { Button, TagGroup } from '@/components/frontend/ui'
import { WorkshopHeaderMotion } from '@/components/frontend/WorkshopHeaderMotion'
import { crossPostSiteName, mediaAlt, mediaFocalStyle, mediaSizeURL, withSiteQuery } from '@/lib/content'
import { formatDate, formatDateRange, formatTimeRange } from '@/lib/format'

/** Full-bleed container + 874px prose column — matches the design content rhythm. */
export const CONTENT_WRAPPER_CLASS = 'container max-lg:px-card'
export const CONTENT_INNER_CLASS = 'mx-auto w-full max-w-[874px]'

/** Sticky on-scroll banner title — shared by workshop + calendar. */
const STICKY_BANNER_TITLE_CLASS =
  'min-w-0 line-clamp-2 font-saans text-lg leading-snug tracking-[-0.36px] text-pretty lg:text-[26px] lg:leading-tight lg:tracking-[-0.52px]'
const STICKY_BANNER_INNER_CLASS = 'container py-3 max-lg:px-card lg:py-4'
const STICKY_BANNER_ROW_CLASS =
  'flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-8'

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
  'inline-flex size-[1.125rem] shrink-0 items-center justify-center opacity-50 [&_svg]:block [&_svg]:size-full'
const META_TEXT_CLASS = 'font-saans text-lg leading-none tracking-[-0.36px]'

function EventMeta({
  href,
  icon,
  text,
  wrapMobile = false,
}: {
  href?: string | null
  icon: ReactNode
  text?: string | null
  /** Mobile: full text, multi-line. Desktop: single-line truncate/nowrap. */
  wrapMobile?: boolean
}) {
  if (!text) return null

  const textClass = wrapMobile
    ? `${META_TEXT_CLASS} min-w-0 whitespace-normal leading-snug lg:truncate lg:leading-none`
    : `${META_TEXT_CLASS} whitespace-nowrap`

  return (
    <div
      className={`flex gap-2.5 ${
        wrapMobile ? 'min-w-0 items-start lg:items-center' : 'shrink-0 items-center'
      }`}
    >
      <span
        aria-hidden="true"
        className={`${META_ICON_CLASS} text-sky ${wrapMobile ? 'mt-0.5 lg:mt-0' : ''}`}
      >
        {icon}
      </span>
      {href ? (
        <a
          className={`${textClass} text-sky underline underline-offset-2`}
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {text}
        </a>
      ) : (
        <span className={`${textClass} text-sky`}>{text}</span>
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
  const stickyCity = item.location?.city || null
  const primaryCta = item.ctas?.find((cta) => cta.url && cta.title)

  const dateMeta = (
    <EventMeta icon={<CalendarIcon />} text={formatDateRange(item.startDate, item.endDate)} />
  )
  const timeMeta = <EventMeta icon={<ClockIcon />} text={formatTimeRange(item.startDate, item.endDate)} />
  const placeMeta = (
    <EventMeta href={item.location?.mapsLink} icon={<PinIcon />} text={placeText} wrapMobile />
  )
  const stickyPlaceMeta = stickyCity ? (
    <EventMeta href={item.location?.mapsLink} icon={<PinIcon />} text={stickyCity} />
  ) : null
  const workshop = item.workshop && typeof item.workshop === 'object' ? item.workshop : null
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
        <section
          aria-label="Přehled události"
          className="container max-sm:px-0"
          data-event-overview-hero
        >
          <div className="flex flex-col border-x-2 border-b-2 border-solid border-ground max-sm:border-x-0 lg:flex-row lg:items-stretch">
            <div className="event-overview-media">
              {cover && mediaSizeURL(cover, 'hero') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={mediaAlt(cover, item.title)}
                  src={mediaSizeURL(cover, 'hero') || ''}
                  style={mediaFocalStyle(cover)}
                />
              ) : null}
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-ground p-card">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2.5 lg:gap-6">
                  <TagGroup
                    tagClassName="text-[10px] lg:text-tag"
                    tags={[...tagTitles(item.tags), origin]}
                    variant="sky"
                  />
                  <h1 className="text-display text-balance text-sky">{item.title}</h1>
                  <div className="mt-3 flex flex-col gap-4 lg:mt-0 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-[30px] lg:gap-y-2">
                    {dateMeta}
                    {timeMeta}
                    {placeMeta}
                  </div>
                </div>
                {signup}
              </div>
            </div>
          </div>

          {workshop?.slug ? (
            <aside
              aria-label="Workshop na zakázku"
              className="flex flex-col gap-4 border-x-2 border-b-2 border-solid border-ground bg-sky p-card max-sm:border-x-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              data-component="event-workshop-cta"
            >
              <p className="m-0 font-inter text-lg font-medium leading-snug text-ground">
                Workshopy jako tento pořádáme pravidelně a také na zakázku.
              </p>
              <div className="flex flex-wrap justify-start gap-3 sm:justify-end">
                <Button
                  href={withSiteQuery(`/kalendar?workshop=${workshop.slug}`, siteSlug)}
                  variant="outline-ground"
                >
                  Aktuální termíny
                </Button>
                <Button
                  href={withSiteQuery(`/workshopy/${workshop.slug}`, siteSlug)}
                  variant="outline-ground"
                >
                  Více o workshopu
                </Button>
              </div>
            </aside>
          ) : null}
        </section>

        <div
          aria-hidden="true"
          aria-label="Přehled události"
          className="event-overview-sticky"
          data-event-overview-sticky
        >
          <div className="bg-ground">
            <div className={STICKY_BANNER_INNER_CLASS}>
              <div className={STICKY_BANNER_ROW_CLASS}>
                <p
                  className={`${STICKY_BANNER_TITLE_CLASS} min-w-0 flex-1 text-sky lg:line-clamp-none`}
                >
                  {item.title}
                </p>
                <div className="hidden max-w-[min(28rem,42%)] flex-wrap items-center justify-end gap-x-[30px] gap-y-2 lg:flex">
                  {dateMeta}
                  {timeMeta}
                  {stickyPlaceMeta}
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

export function EventBody({ item }: { item: Kalendar }) {
  return (
    <div className="flex flex-col gap-content">
      <Prose data={item.content} />
    </div>
  )
}

export function EventDetail({ item, siteSlug }: { item: Kalendar; siteSlug: string }) {
  return (
    <article>
      <EventOverview item={item} siteSlug={siteSlug} />
      <div className="pt-content-top">
        <EventBody item={item} />
      </div>
    </article>
  )
}

export function NewsArticleHero({ item }: { item: Aktuality }) {
  const cover = item.coverImage && typeof item.coverImage === 'object' ? item.coverImage : null
  const heroUrl = cover ? mediaSizeURL(cover, 'hero') : null
  if (!heroUrl || item.layout === 'small') return null

  return (
    <div
      aria-hidden="true"
      className="article-hero-big border-b-2 border-b-ground"
      data-component="news-article-hero"
      data-variant="big"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className="size-full object-cover"
        src={heroUrl}
        style={mediaFocalStyle(cover)}
      />
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
  const heroUrl = cover ? mediaSizeURL(cover, 'hero') : null
  const cardUrl = cover ? mediaSizeURL(cover, 'card') : null

  return (
    <article data-component="news-article" data-layout={small ? 'small' : 'big'}>
      {heroUrl && !small && !skipBigHero ? (
        <div
          aria-hidden="true"
          className="article-hero-big border-b-2 border-b-ground"
          data-component="news-article-hero"
          data-variant="big"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="size-full object-cover"
            src={heroUrl}
            style={mediaFocalStyle(cover)}
          />
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

        {cardUrl && small ? (
          <div
            aria-hidden="true"
            className="article-hero-small mx-auto w-full max-w-[1094px] overflow-hidden border-2 border-ground"
            data-component="news-article-hero"
            data-variant="small"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              className="size-full object-cover"
              src={cardUrl}
              style={mediaFocalStyle(cover)}
            />
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
      <header
        aria-label="Přehled workshopu"
        className="container max-sm:px-0"
        data-workshop-header-hero
      >
        <div className="overflow-hidden border-x-2 border-b-2 border-solid border-ground bg-sky max-sm:border-x-0">
          <div className="relative">
            <div className="relative aspect-4/3 overflow-hidden bg-ground lg:absolute lg:inset-y-0 lg:left-0 lg:z-0 lg:aspect-auto lg:w-[min(42%,480px)]">
              {cover && mediaSizeURL(cover, 'landscape') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="absolute inset-0 size-full object-cover object-center"
                  src={mediaSizeURL(cover, 'landscape') || ''}
                  style={mediaFocalStyle(cover)}
                />
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
          <div className={STICKY_BANNER_INNER_CLASS}>
            <div className={STICKY_BANNER_ROW_CLASS}>
              <p className={`${STICKY_BANNER_TITLE_CLASS} flex-1 text-ground`}>
                {item.title}
              </p>
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
    <header className="w-full pt-content-top" data-block="publication-header" data-component="publication-header">
      <ContentColumn>
        <div className="flex flex-col gap-grid lg:flex-row lg:items-start lg:gap-8">
          <div className="flex h-[min(280px,45vh)] w-full max-w-[200px] shrink-0 items-start justify-start sm:h-[min(220px,32vh)] sm:max-w-[140px] lg:h-[min(260px,35vh)] lg:max-w-[160px]">
            {cover && mediaSizeURL(cover, 'large') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={mediaAlt(cover, item.title)}
                className="max-h-full max-w-full object-contain object-left"
                src={mediaSizeURL(cover, 'large') || ''}
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

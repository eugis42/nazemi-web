import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

import type { Aktuality, Kalendar, Lide, Projekty, Publikace, Site, Workshopy } from '@/payload-types'
import { Button, Divider, MetaLine, TagGroup } from '@/components/frontend/ui'
import { mapCtaVariant } from '@/lib/block-actions'
import { isColorToken, resolveColor } from '@/lib/colors'
import { crossPostSiteName, mediaAlt, mediaCardURL, withSiteQuery } from '@/lib/content'
import { formatDate, formatDateRange } from '@/lib/format'
import { isExternalHref } from '@/lib/links'

const PROJECT_COLOR_CLASS: Record<string, string> = {
  blue: 'bg-blue text-ground',
  green: 'bg-green text-ground',
  nerust: 'bg-nerust text-sky',
  turquoise: 'bg-turquoise text-ground',
  violet: 'bg-violet text-ground',
  orange: 'bg-orange text-ground',
  pink: 'bg-pink text-ground',
  brown: 'bg-brown text-ground',
  gray: 'bg-gray text-ground',
}

export const PAGE_INTRO_COLOR_CLASS: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue', text: 'text-ground' },
  brown: { bg: 'bg-brown', text: 'text-ground' },
  gray: { bg: 'bg-gray', text: 'text-ground' },
  green: { bg: 'bg-green', text: 'text-ground' },
  ground: { bg: 'bg-ground', text: 'text-sky' },
  nerust: { bg: 'bg-nerust', text: 'text-sky' },
  orange: { bg: 'bg-orange', text: 'text-ground' },
  pink: { bg: 'bg-pink', text: 'text-ground' },
  sky: { bg: 'bg-sky', text: 'text-ground' },
  turquoise: { bg: 'bg-turquoise', text: 'text-ground' },
  violet: { bg: 'bg-violet', text: 'text-ground' },
}

function CardLink({
  ariaLabel,
  children,
  className,
  component,
  external,
  href,
}: {
  ariaLabel: string
  children: ReactNode
  className: string
  component: string
  external?: boolean
  href: string
}) {
  if (external) {
    return (
      <a
        aria-label={ariaLabel}
        className={className}
        data-component={component}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {children}
      </a>
    )
  }

  return (
    <Link aria-label={ariaLabel} className={className} data-component={component} href={href}>
      {children}
    </Link>
  )
}

function tagTitles(items?: (number | { title?: string | null })[] | null) {
  if (!items?.length) return []
  return items
    .filter((item): item is { title?: string | null } => typeof item === 'object' && item !== null)
    .map((item) => item.title || '')
}

export function EventCard({ item, siteSlug }: { item: Kalendar; siteSlug: string }) {
  const cover = item.coverImage && typeof item.coverImage === 'object' ? item.coverImage : null
  const origin = crossPostSiteName({
    currentSiteSlug: siteSlug,
    docSite: item.site,
  })
  const meta = [
    formatDateRange(item.startDate, item.endDate),
    item.location?.city,
    item.location?.venue,
    origin,
  ]
    .filter(Boolean)
    .join(' · ')
  const buttonLabel = 'Více info'

  return (
    <CardLink
      ariaLabel={`${item.title}. ${buttonLabel}`}
      className="card-tile flex flex-1 flex-col border-2 border-ground bg-ground"
      component="event-card"
      href={withSiteQuery(`/kalendar/${item.slug}`, siteSlug)}
    >
      <div className="relative aspect-square w-full overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            src={mediaCardURL(cover) || cover.url || ''}
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col justify-between gap-6 p-card">
        <div className="flex flex-col gap-2.5">
          <MetaLine inverted text={meta} />
          <h3 className="text-card-title text-sky">{item.title}</h3>
          <TagGroup tags={tagTitles(item.tags)} variant="sky" />
        </div>
        <Button tag="span" variant="outline-sky">
          {buttonLabel}
        </Button>
      </div>
    </CardLink>
  )
}

export function NewsCard({ item, siteSlug }: { item: Aktuality; siteSlug: string }) {
  const cover = item.coverImage && typeof item.coverImage === 'object' ? item.coverImage : null
  const origin = crossPostSiteName({
    currentSiteSlug: siteSlug,
    docSite: item.site,
  })
  const external = Boolean(item.externalUrl)
  const buttonLabel = 'Přečíst článek'

  return (
    <CardLink
      ariaLabel={`${item.title}. ${external ? '↗ ' : ''}${buttonLabel}`}
      className="card-tile flex min-w-0 flex-1 flex-col self-stretch overflow-hidden border-2 border-ground bg-sky"
      component="news-card"
      external={external}
      href={item.externalUrl || withSiteQuery(`/aktuality/${item.slug}`, siteSlug)}
    >
      <div
        aria-hidden="true"
        className="h-[253px] w-full shrink-0 overflow-hidden bg-sky bg-cover bg-top bg-no-repeat bg-blend-multiply"
        data-part="media"
        role="img"
        style={
          cover && mediaCardURL(cover)
            ? { backgroundImage: `url('${mediaCardURL(cover)}')` }
            : undefined
        }
      />
      <Divider />
      <div className="flex flex-1 flex-col justify-between gap-6 p-card">
        <div className="flex flex-col gap-2.5">
          <MetaLine external={external} source={origin} text={formatDate(item.publishedAt)} />
          <h3 className="text-card-title">{item.title}</h3>
        </div>
        <Button tag="span" variant="outline">
          {buttonLabel}
        </Button>
      </div>
    </CardLink>
  )
}

export function WorkshopCard({ item, siteSlug }: { item: Workshopy; siteSlug: string }) {
  const cover = item.coverImage && typeof item.coverImage === 'object' ? item.coverImage : null
  const buttonLabel = 'Více o workshopu'

  return (
    <CardLink
      ariaLabel={`${item.title}. ${buttonLabel}`}
      className="card-tile flex h-full flex-col overflow-hidden border-2 border-ground bg-sky"
      component="workshop-card"
      href={withSiteQuery(`/workshopy/${item.slug}`, siteSlug)}
    >
      <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden bg-ground">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={mediaAlt(cover, item.title)}
            className="size-full object-cover"
            loading="lazy"
            src={mediaCardURL(cover) || cover.url || ''}
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-6 p-card">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-tag" data-component="workshop-tags">
            <TagGroup muted={false} tags={tagTitles(item.audiences)} />
            <TagGroup muted={false} tags={tagTitles(item.topics)} />
          </div>
          <h3 className="text-card-title text-ground">{item.title}</h3>
        </div>
        <Button tag="span" variant="outline-ground">
          {buttonLabel}
        </Button>
      </div>
    </CardLink>
  )
}

export function BookCard({ item, siteSlug }: { item: Publikace; siteSlug: string }) {
  const cover = item.coverImage && typeof item.coverImage === 'object' ? item.coverImage : null
  const buttonLabel = 'Více o publikaci'

  return (
    <CardLink
      ariaLabel={`${item.title}. ${buttonLabel}`}
      className="card-tile flex h-full flex-col gap-2"
      component="book-card"
      href={withSiteQuery(`/publikace/${item.slug}`, siteSlug)}
    >
      <div className="relative mb-2 aspect-[2/3] w-1/2 shrink-0 overflow-hidden bg-ground/5">
        {cover?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={mediaAlt(cover, item.title)}
            className="absolute inset-0 size-full object-cover object-center"
            loading="lazy"
            src={cover.url}
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-card-title text-ground">{item.title}</h3>
        {item.authorName ? (
          <p className="font-saans text-body text-ground/70">{item.authorName}</p>
        ) : null}
      </div>
      <div className="my-2.5 flex flex-wrap gap-tag" data-component="book-tags">
        <TagGroup muted={false} tags={tagTitles(item.types)} />
        <TagGroup muted={false} tags={tagTitles(item.topics)} />
      </div>
      {item.excerpt ? <p className="text-body-inter text-ground">{item.excerpt}</p> : null}
      <Button className="mt-auto self-start" tag="span" variant="outline-ground">
        {buttonLabel}
      </Button>
    </CardLink>
  )
}

const DEFAULT_PROJECT_LOGO_CLASS = 'h-[95px] w-[150px]'

/** Fallback logo proportions from the design when the project has no `logoClass`. */
const PROJECT_LOGO_CLASS: Record<string, string> = {
  'flow-makers': 'h-[62px] w-[151px]',
  'generace-symbiocen': 'h-[68px] w-[150px]',
  nanebi: 'h-[150px] w-[150px]',
  nerust: 'h-[95px] w-[150px]',
}

/** Rows with a tall logo need extra height (design: `data/projects.js` `className`). */
const PROJECT_ROW_CLASS: Record<string, string> = {
  nanebi: 'min-h-[210px]',
}

function projectLogoClass(item: Projekty) {
  return item.logoClass || PROJECT_LOGO_CLASS[item.slug || ''] || DEFAULT_PROJECT_LOGO_CLASS
}

function projectDetailVariant(isDark: boolean) {
  return isDark ? 'outline-sky' : 'outline'
}

function projectLinks(item: Projekty, isDark: boolean) {
  return (item.ctas || []).map((link, index) =>
    link.url && link.title ? (
      <Button
        href={link.url}
        key={`${link.title}-${index}`}
        variant={mapCtaVariant(link.variant) || (isDark ? 'outline-sky' : 'outline')}
      >
        {link.title}
      </Button>
    ) : null,
  )
}

function projectSurface(color?: string | null) {
  if (color && isColorToken(color) && PROJECT_COLOR_CLASS[color]) {
    return { className: PROJECT_COLOR_CLASS[color], style: undefined as undefined }
  }
  const resolved = resolveColor(color) || 'var(--color-green)'
  const isDark = color === 'nerust' || color === 'ground'
  return {
    className: isDark ? 'text-sky' : 'text-ground',
    style: { backgroundColor: resolved } as CSSProperties,
  }
}

export function ProjectRow({ item, siteSlug }: { item: Projekty; siteSlug: string }) {
  const logo = item.logo && typeof item.logo === 'object' ? item.logo : null
  const color = item.projectColor || 'green'
  const isDark = color === 'nerust' || color === 'ground'
  const textColor = isDark ? 'text-sky' : 'text-ground'
  const surface = projectSurface(color)

  return (
    <article
      className={`blend-multiply flex min-h-[157px] flex-col items-start gap-8 border-2 border-ground p-card lg:flex-row lg:items-center lg:gap-content ${surface.className} ${PROJECT_ROW_CLASS[item.slug || ''] || ''}`}
      data-component="project-row"
      data-variant={color}
      style={surface.style}
    >
      <div className={`relative shrink-0 ${projectLogoClass(item)}`}>
        {logo?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={mediaAlt(logo, item.title)}
            className="size-full object-contain object-left"
            loading="lazy"
            src={logo.url}
          />
        ) : null}
      </div>
      <div className={`flex flex-1 flex-col justify-center gap-2.5 ${textColor}`}>
        <h3 className={`text-card-title ${textColor}`}>{item.title}</h3>
        {item.excerpt ? <p className={`text-body-inter ${textColor}`}>{item.excerpt}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-start justify-center gap-2.5 lg:items-end">
        <Button
          href={withSiteQuery(`/projekty/${item.slug}`, siteSlug)}
          variant={projectDetailVariant(isDark)}
        >
          {`Více o ${item.title}`}
        </Button>
        {projectLinks(item, isDark)}
      </div>
    </article>
  )
}

/** Full-bleed colored band — project detail hero and the /projekty overview rows. */
export function ProjectHeader({
  headingLevel = 'h1',
  item,
  siteSlug,
  spacing = 'detail',
}: {
  headingLevel?: 'h1' | 'h2'
  item: Projekty
  siteSlug?: string
  spacing?: 'detail' | 'stacked' | 'stacked-first'
}) {
  const logo = item.logo && typeof item.logo === 'object' ? item.logo : null
  const color = item.projectColor || 'green'
  const isDark = color === 'nerust' || color === 'ground'
  const textColor = isDark ? 'text-sky' : 'text-ground'
  const surface = projectSurface(color)
  const Tag = headingLevel === 'h2' ? 'h2' : 'h1'
  const Wrapper = headingLevel === 'h2' ? 'section' : 'header'
  const titleClass = headingLevel === 'h2' ? 'text-card-title' : 'text-display'
  const spacingClass =
    spacing === 'stacked'
      ? 'py-card'
      : spacing === 'stacked-first'
        ? 'py-card lg:pt-8 lg:pb-card'
        : 'py-card lg:pt-8 lg:pb-card'

  return (
    <Wrapper
      className={`blend-multiply w-full border-b-2 border-b-ground ${surface.className}`}
      data-block="project-hero"
      data-component="project-header"
      data-variant={color}
      style={surface.style}
    >
      <div
        className={`container max-lg:px-card ${spacingClass}`}
      >
        <div
          className={`flex min-h-[157px] min-w-0 flex-col items-start gap-8 lg:flex-row lg:items-center lg:gap-content ${PROJECT_ROW_CLASS[item.slug || ''] || ''}`}
        >
          <div className={`relative shrink-0 ${projectLogoClass(item)}`}>
            {logo?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={mediaAlt(logo, item.title)}
                className="size-full object-contain object-left"
                src={logo.url}
              />
            ) : null}
          </div>
          <div className={`flex min-w-0 flex-1 flex-col justify-center gap-2.5 ${textColor}`}>
            <Tag className={`${titleClass} ${textColor}`}>{item.title}</Tag>
            {item.excerpt ? <p className={`text-body-inter ${textColor}`}>{item.excerpt}</p> : null}
          </div>
          <div className="flex shrink-0 flex-col items-start justify-center gap-2.5 lg:items-end">
            {headingLevel === 'h2' && siteSlug ? (
              <Button
                href={withSiteQuery(`/projekty/${item.slug}`, siteSlug)}
                variant={projectDetailVariant(isDark)}
              >
                {`Více o ${item.title}`}
              </Button>
            ) : null}
            {projectLinks(item, isDark)}
          </div>
        </div>
      </div>
    </Wrapper>
  )
}

const CONTACT_VARIANT_CLASS: Record<string, { bg: string; note: string; text: string }> = {
  blue: { bg: 'bg-blue', note: 'text-ground/80', text: 'text-ground' },
  green: { bg: 'bg-green', note: 'text-ground/80', text: 'text-ground' },
  sky: { bg: 'bg-sky', note: 'text-ground/80', text: 'text-ground' },
}

type ContactDetail = NonNullable<Site['contactDetails']>[number]

export function ContactBlock({
  block,
  className = '',
  variant = 'sky',
}: {
  block: ContactDetail
  className?: string
  variant?: 'sky' | 'green' | 'blue'
}) {
  const colors = CONTACT_VARIANT_CLASS[variant]

  return (
    <article
      className={`box-border flex shrink-0 grow-0 flex-col gap-2.5 ${colors.bg} p-card ${className}`}
      data-component="contact-block"
      data-variant={variant}
    >
      <h2 className={`text-section-title ${colors.text}`}>{block.title}</h2>
      {block.email ? (
        <a className={`text-card-title ${colors.text} underline`} href={`mailto:${block.email}`}>
          {block.email}
        </a>
      ) : null}
      {block.addressLines?.length ? (
        <p className={`text-body-inter ${colors.text}`}>
          {block.addressLines.map((row, index) => (
            <span key={`${row.line}-${index}`}>
              {index > 0 ? <br /> : null}
              {row.line}
            </span>
          ))}
        </p>
      ) : null}
      {block.note ? <p className={`text-body-inter ${colors.note}`}>{block.note}</p> : null}
      {block.phone ? (
        <p className={`text-body-inter ${colors.text}`}>
          <a className="underline" href={`tel:${block.phone.replace(/\s/g, '')}`}>
            {block.phone}
          </a>
        </p>
      ) : null}
      {block.links?.length ? (
        <p className={`text-body-inter ${colors.text}`}>
          {block.links.map((link, index) => {
            const external = isExternalHref(link.href)
            return (
              <span key={`${link.href}-${index}`}>
                {index > 0 ? <br /> : null}
                <a
                  className="underline"
                  href={link.href || '#'}
                  rel={external ? 'noopener noreferrer' : undefined}
                  target={external ? '_blank' : undefined}
                >
                  {external ? `↗ ${link.label}` : link.label}
                </a>
              </span>
            )
          })}
        </p>
      ) : null}
      {block.extras?.length ? (
        <p className={`text-body-inter ${colors.text}`}>
          {block.extras.map((extra, index) => (
            <span key={`${extra.label}-${index}`}>
              {index > 0 ? <br /> : null}
              {extra.label ? (
                <>
                  {extra.label}
                  {extra.value ? `: ${extra.value}` : ''}
                </>
              ) : (
                extra.value
              )}
            </span>
          ))}
        </p>
      ) : null}
      {block.legacyPlainText ? (
        <p className={`text-body-inter ${colors.text}`}>{block.legacyPlainText}</p>
      ) : null}
    </article>
  )
}

export function TeamMemberCard({ person }: { person: Lide }) {
  const image = person.image && typeof person.image === 'object' ? person.image : null
  const initials = person.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)

  return (
    <article
      className="box-border flex w-full shrink-0 grow-0 flex-col items-start gap-2.5 bg-sky p-card text-left sm:w-[calc((100%-2px)/2)] lg:w-[calc((100%-4px)/3)] xl:w-[calc((100%-6px)/4)]"
      data-component="team-member-card"
    >
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ground bg-green/30 lg:size-24">
        {image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={mediaAlt(image, person.name)}
            className="size-full object-cover"
            loading="lazy"
            src={image.url}
          />
        ) : (
          <span aria-hidden="true" className="font-saans text-lg leading-none text-ground">
            {initials}
          </span>
        )}
      </div>
      <div className="flex w-full flex-col gap-1">
        <h3 className="text-card-title text-ground">{person.name}</h3>
        {person.role ? <p className="text-body-inter text-ground">{person.role}</p> : null}
        {person.phone || person.email ? (
          <p className="text-body-inter mt-4 text-ground">
            {person.phone ? (
              <a className="underline" href={`tel:${person.phone.replace(/[^\d+]/g, '')}`}>
                {person.phone}
              </a>
            ) : null}
            {person.phone && person.email ? <br /> : null}
            {person.email ? (
              <a className="underline break-all" href={`mailto:${person.email}`}>
                {person.email}
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    </article>
  )
}

export function PageIntro({
  color,
  coverAlt,
  coverUrl,
  description,
  title,
}: {
  color?: string | null
  coverAlt?: string
  coverUrl?: string | null
  description?: string | null
  title?: string | null
}) {
  const hasColor = Boolean(color && color !== 'none')
  const tokenPalette = hasColor && isColorToken(color) ? PAGE_INTRO_COLOR_CLASS[color as string] : null
  const customBg = hasColor && !tokenPalette ? resolveColor(color) : undefined

  if (coverUrl) {
    return (
      <header
        className="page-intro-cover relative min-h-[66vh] w-full overflow-hidden border-b-2 border-b-ground"
        data-block="page-intro"
        data-component="page-intro"
        data-has-cover="true"
      >
        <div aria-hidden="true" className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={coverAlt || ''} className="size-full object-cover" src={coverUrl} />
          <div className="absolute inset-0 bg-ground/33" />
        </div>
        <div className="container relative z-10 flex min-h-[66vh] flex-col justify-end py-card max-lg:px-card lg:pt-8 lg:pb-card">
          <PageIntroContent description={description} textClass="text-sky" title={title} />
        </div>
      </header>
    )
  }

  return (
    <header
      className={`w-full border-b-2 border-b-ground ${customBg ? '' : tokenPalette ? tokenPalette.bg : 'bg-sky'}`}
      data-block="page-intro"
      data-component="page-intro"
      data-variant={hasColor ? color || undefined : undefined}
      style={customBg ? { backgroundColor: customBg } : undefined}
    >
      <div className="container py-card max-lg:px-card lg:pt-8 lg:pb-card">
        <PageIntroContent
          description={description}
          textClass={customBg ? 'text-ground' : tokenPalette ? tokenPalette.text : 'text-ground'}
          title={title}
        />
      </div>
    </header>
  )
}

function PageIntroContent({
  description,
  textClass,
  title,
}: {
  description?: string | null
  textClass: string
  title?: string | null
}) {
  return (
    <div className="mx-auto flex w-full max-w-[874px] flex-col gap-2.5">
      {title ? <h1 className={`text-display ${textClass}`}>{title}</h1> : null}
      {description ? <p className={`text-body-inter ${textClass}`}>{description}</p> : null}
    </div>
  )
}

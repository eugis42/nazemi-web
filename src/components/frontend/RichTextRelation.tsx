import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

import type {
  Aktuality,
  Kalendar,
  Lide,
  Media,
  Projekty,
  Publikace,
  Stranky,
  Workshopy,
} from '@/payload-types'
import { StretchAspectThumb } from '@/components/frontend/StretchAspectThumb'
import { Button, TagGroup } from '@/components/frontend/ui'
import { mapCtaVariant } from '@/lib/block-actions'
import {
  crossPostOriginSite,
  mediaAlt,
  mediaFocalStyle,
  mediaSizeURL,
  mediaURL,
  siteBrandStyle,
  withSiteQuery,
} from '@/lib/content'
import { formatDate, formatDateRange } from '@/lib/format'
import type { RichTextRelationCollection } from '@/lib/lexical-editor'
import { isColorToken, resolveColor } from '@/lib/colors'

const TYPE_LABEL: Record<RichTextRelationCollection, string> = {
  stranky: 'Stránka',
  kalendar: 'Událost',
  aktuality: 'Článek',
  projekty: 'Projekt',
  publikace: 'Publikace',
  lide: 'Osoba',
  workshopy: 'Workshop',
}

/** Free embeds: soft primary tint (site `--color-ground`). */
const FREE_SURFACE = 'bg-ground/5 p-[15px]'
const HALF_PAD = 'p-[15px]'
/** Soft surface without pad — pad lives on Body; media flush to edges. */
const FREE_SURFACE_FLUSH = 'bg-ground/5'

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

function asDoc<T>(value: unknown): T | null {
  if (!value || typeof value !== 'object') return null
  return value as T
}

function docTitle(doc: { name?: string | null; title?: string | null; slug?: string | null }) {
  return (doc.title || doc.name || doc.slug || '').trim()
}

function tagTitles(items?: (number | { title?: string | null })[] | null) {
  if (!items?.length) return []
  return items
    .filter((item): item is { title?: string | null } => typeof item === 'object' && item !== null)
    .map((item) => item.title || '')
    .filter(Boolean)
}

/**
 * Side media column: stretches to card height.
 * Pass width classes; child = absolute inset-0 + object-cover|contain.
 */
function MediaRail({
  children,
  className = 'w-[7.5rem] sm:w-36',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`pointer-events-none relative z-[1] shrink-0 self-stretch overflow-hidden ${className}`}
    >
      {children}
    </div>
  )
}

function Cover({
  alt,
  className,
  media,
  size,
}: {
  alt: string
  className: string
  media: Media | null
  size: 'square' | 'card' | 'landscape' | 'portrait' | 'thumb'
}) {
  const src = media ? mediaSizeURL(media, size) : null
  if (!src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={`pointer-events-none ${className} object-cover`}
      loading="lazy"
      src={src}
      style={mediaFocalStyle(media)}
    />
  )
}

/**
 * Whole block clickable via stretched link under content.
 * Content uses pointer-events-none; Actions / nested links use pointer-events-auto.
 */
function Frame({
  children,
  className = '',
  external,
  href,
  label,
  style,
}: {
  children: ReactNode
  className?: string
  external?: boolean
  href?: string | null
  label?: string
  style?: CSSProperties
}) {
  return (
    <article
      className={`not-prose relative flex gap-4 ${className}`}
      data-component="richtext-relation"
      style={style}
    >
      {href ? (
        external ? (
          <a
            aria-label={label}
            className="absolute inset-0 z-0"
            href={href}
            rel="noopener noreferrer"
            target="_blank"
          />
        ) : (
          <Link aria-label={label} className="absolute inset-0 z-0" href={href} />
        )
      ) : null}
      {children}
    </article>
  )
}

function Eyebrow({
  children,
  tone = 'muted',
}: {
  children: ReactNode
  tone?: 'muted' | 'sky'
}) {
  const color = tone === 'sky' ? 'text-sky/70' : 'text-ground/60'
  return (
    <span className={`pointer-events-none font-saans text-tag tracking-wide ${color}`}>
      {children}
    </span>
  )
}

function Body({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`pointer-events-none relative z-[1] flex min-w-0 flex-1 flex-col items-start gap-2.5 ${className}`}
    >
      {children}
    </div>
  )
}

function Title({
  children,
  className = 'text-ground',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span className={`pointer-events-none font-saans text-card-title leading-snug ${className}`}>
      {children}
    </span>
  )
}

function Actions({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-auto relative z-[1] mt-auto flex flex-wrap gap-2.5 pt-1">
      {children}
    </div>
  )
}

function PageEmbed({ doc, siteSlug }: { doc: Stranky; siteSlug: string }) {
  const title = docTitle(doc)
  const href = withSiteQuery(doc.slug === 'home' || doc.isHomepage ? '/' : `/${doc.slug}`, siteSlug)
  return (
    <Frame className={`items-start ${FREE_SURFACE}`} href={href} label={title}>
      <Body>
        <Title>{title}</Title>
        {doc.excerpt ? <p className="text-body-inter text-ground/80">{doc.excerpt}</p> : null}
        <Actions>
          <Button href={href} variant="outline-ground">
            Zobrazit stránku
          </Button>
        </Actions>
      </Body>
    </Frame>
  )
}

function EventEmbed({ doc, siteSlug }: { doc: Kalendar; siteSlug: string }) {
  const cover = doc.coverImage && typeof doc.coverImage === 'object' ? doc.coverImage : null
  const title = docTitle(doc)
  const originSite = crossPostOriginSite({
    currentSiteSlug: siteSlug,
    docSite: doc.site,
  })
  const href = withSiteQuery(`/kalendar/${doc.slug}`, originSite?.slug || siteSlug)
  const meta = [
    TYPE_LABEL.kalendar,
    formatDateRange(doc.startDate, doc.endDate),
    doc.location?.name,
    doc.location?.city,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Frame
      className="items-stretch gap-0 overflow-hidden border-2 border-ground bg-ground"
      external={Boolean(originSite)}
      href={href}
      label={title}
      style={originSite ? siteBrandStyle(originSite) : undefined}
    >
      {cover && (mediaSizeURL(cover, 'square') || mediaURL(cover)) ? (
        <StretchAspectThumb
          alt=""
          aspectRatio={1}
          objectFit="cover"
          src={mediaSizeURL(cover, 'square') || mediaURL(cover) || ''}
          style={mediaFocalStyle(cover)}
        />
      ) : null}
      <Body className={HALF_PAD}>
        {meta ? <Eyebrow tone="sky">{meta}</Eyebrow> : null}
        <Title className="text-sky">{title}</Title>
        <TagGroup tags={tagTitles(doc.tags)} variant="sky" />
        <div className="pointer-events-none relative z-[1] mt-auto flex items-center gap-3 pt-1">
          <Button
            className="pointer-events-auto shrink-0"
            href={href}
            newTab={Boolean(originSite)}
            variant="outline-sky"
          >
            Zobrazit událost
          </Button>
          {originSite ? (
            <span className="min-w-0 font-saans text-tag leading-tight text-sky opacity-75">
              <span className="inline-block">↗ Na webu</span>{' '}
              <span className="inline-block">{originSite.name}</span>
            </span>
          ) : null}
        </div>
      </Body>
    </Frame>
  )
}

function NewsEmbed({ doc, siteSlug }: { doc: Aktuality; siteSlug: string }) {
  const cover = doc.coverImage && typeof doc.coverImage === 'object' ? doc.coverImage : null
  const title = docTitle(doc)
  const external = Boolean(doc.externalUrl)
  const href = doc.externalUrl || withSiteQuery(`/aktuality/${doc.slug}`, siteSlug)
  const author =
    doc.authorName?.trim() ||
    (doc.author && typeof doc.author === 'object' ? doc.author.name?.trim() : '') ||
    ''
  const eyebrow = [TYPE_LABEL.aktuality, formatDate(doc.publishedAt), author]
    .filter(Boolean)
    .join(' · ')
  const excerpt = doc.description?.trim()

  return (
    <Frame
      className={`items-stretch gap-0 overflow-hidden ${FREE_SURFACE_FLUSH}`}
      external={external}
      href={href}
      label={title}
    >
      {cover ? (
        <MediaRail className="w-40 sm:w-48">
          <Cover alt="" className="absolute inset-0 size-full" media={cover} size="landscape" />
        </MediaRail>
      ) : null}
      <Body className={HALF_PAD}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Title>{title}</Title>
        {excerpt ? <p className="text-body-inter line-clamp-3 text-ground/80">{excerpt}</p> : null}
        <Actions>
          <Button external={external} href={href} variant="outline-ground">
            Číst dál
          </Button>
        </Actions>
      </Body>
    </Frame>
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

function ProjectEmbed({ doc, siteSlug }: { doc: Projekty; siteSlug: string }) {
  const logo = doc.logo && typeof doc.logo === 'object' ? doc.logo : null
  const title = docTitle(doc)
  const color = doc.projectColor || 'green'
  const isDark = color === 'nerust' || color === 'ground'
  const textColor = isDark ? 'text-sky' : 'text-ground'
  const detailHref = withSiteQuery(`/projekty/${doc.slug}`, siteSlug)
  const surface = projectSurface(color)

  return (
    <Frame
      className={`blend-multiply items-center border-2 border-ground p-[15px] ${surface.className}`}
      href={detailHref}
      label={title}
      style={surface.style}
    >
      {logo?.url ? (
        <div className="pointer-events-none relative z-[1] flex h-14 w-28 shrink-0 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={mediaAlt(logo, title)}
            className="max-h-full max-w-full object-contain object-left"
            loading="lazy"
            src={logo.url}
          />
        </div>
      ) : null}
      <Body className={textColor}>
        <Title className={textColor}>{title}</Title>
        {doc.excerpt ? <p className={`text-body-inter ${textColor} opacity-90`}>{doc.excerpt}</p> : null}
        <Actions>
          <Button href={detailHref} variant={isDark ? 'outline-sky' : 'outline-ground'}>
            {`Více o ${title}`}
          </Button>
          {(doc.ctas || []).map((link, index) =>
            link.url && link.title ? (
              <Button
                backgroundColor={link.backgroundColor}
                href={link.url}
                key={`${link.title}-${index}`}
                variant={mapCtaVariant(link.variant) || (isDark ? 'outline-sky' : 'outline')}
              >
                {link.title}
              </Button>
            ) : null,
          )}
        </Actions>
      </Body>
    </Frame>
  )
}

function PublicationEmbed({ doc, siteSlug }: { doc: Publikace; siteSlug: string }) {
  const cover = doc.coverImage && typeof doc.coverImage === 'object' ? doc.coverImage : null
  const title = docTitle(doc)
  const detailHref = withSiteQuery(`/publikace/${doc.slug}`, siteSlug)
  const primaryCta = (doc.ctas || []).find((c) => c.url && c.title)
  const coverSrc = cover
    ? mediaSizeURL(cover, 'portrait') || mediaSizeURL(cover, 'large') || mediaURL(cover)
    : null

  return (
    <Frame className={`items-stretch gap-0 overflow-hidden ${FREE_SURFACE_FLUSH}`} href={detailHref} label={title}>
      {coverSrc ? (
        <StretchAspectThumb
          alt={mediaAlt(cover, title)}
          objectFit="contain"
          src={coverSrc}
        />
      ) : null}
      <Body className={HALF_PAD}>
        <Eyebrow>{TYPE_LABEL.publikace}</Eyebrow>
        <Title>{title}</Title>
        {doc.authorName ? <p className="text-body-inter text-ground/70">{doc.authorName}</p> : null}
        {doc.excerpt ? (
          <p className="text-body-inter line-clamp-2 text-ground/80">{doc.excerpt}</p>
        ) : null}
        <Actions>
          <Button href={detailHref} variant="outline-ground">
            Více o publikaci
          </Button>
          {primaryCta ? (
            <Button external href={primaryCta.url} variant="filled-green">
              {primaryCta.title}
            </Button>
          ) : null}
        </Actions>
      </Body>
    </Frame>
  )
}

function PersonEmbed({ doc }: { doc: Lide }) {
  const image = doc.image && typeof doc.image === 'object' ? doc.image : null
  const title = docTitle(doc)
  const initials = title
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
  const href = doc.email
    ? `mailto:${doc.email}`
    : doc.phone
      ? `tel:${doc.phone.replace(/[^\d+]/g, '')}`
      : null

  return (
    <Frame className={`items-start ${FREE_SURFACE}`} external={Boolean(href)} href={href} label={title}>
      <div className="pointer-events-none relative z-[1] flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ground bg-green/30 sm:size-20">
        {image && mediaSizeURL(image, 'thumb') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={mediaAlt(image, title)}
            className="size-full object-cover"
            loading="lazy"
            src={mediaSizeURL(image, 'thumb') || ''}
            style={mediaFocalStyle(image)}
          />
        ) : (
          <span aria-hidden className="font-saans text-lg text-ground">
            {initials}
          </span>
        )}
      </div>
      <Body>
        <Title>{title}</Title>
        {doc.role ? <p className="text-body-inter text-ground">{doc.role}</p> : null}
        {doc.phone || doc.email ? (
          <p className="pointer-events-auto text-body-inter text-ground/80">
            {doc.phone ? (
              <a className="underline" href={`tel:${doc.phone.replace(/[^\d+]/g, '')}`}>
                {doc.phone}
              </a>
            ) : null}
            {doc.phone && doc.email ? <br /> : null}
            {doc.email ? (
              <a className="break-all underline" href={`mailto:${doc.email}`}>
                {doc.email}
              </a>
            ) : null}
          </p>
        ) : null}
      </Body>
    </Frame>
  )
}

function WorkshopEmbed({ doc, siteSlug }: { doc: Workshopy; siteSlug: string }) {
  const cover = doc.coverImage && typeof doc.coverImage === 'object' ? doc.coverImage : null
  const title = docTitle(doc)
  const href = withSiteQuery(`/workshopy/${doc.slug}`, siteSlug)

  return (
    <Frame className={`items-stretch gap-0 overflow-hidden ${FREE_SURFACE_FLUSH}`} href={href} label={title}>
      {cover ? (
        <MediaRail>
          <Cover
            alt={mediaAlt(cover, title)}
            className="absolute inset-0 size-full"
            media={cover}
            size="square"
          />
        </MediaRail>
      ) : null}
      <Body className={HALF_PAD}>
        <Eyebrow>{TYPE_LABEL.workshopy}</Eyebrow>
        <Title>{title}</Title>
        <TagGroup muted={false} tags={[...tagTitles(doc.audiences), ...tagTitles(doc.topics)]} />
        {doc.excerpt ? (
          <p className="text-body-inter line-clamp-2 text-ground/80">{doc.excerpt}</p>
        ) : null}
        <Actions>
          <Button href={href} variant="outline-ground">
            Zobrazit workshop
          </Button>
        </Actions>
      </Body>
    </Frame>
  )
}

/** Compact Lexical relationship embed — free layout; event keeps bordered tile. */
export function RichTextRelation({
  relationTo,
  siteSlug = '',
  value,
}: {
  relationTo: string
  siteSlug?: string
  value: unknown
}) {
  switch (relationTo as RichTextRelationCollection) {
    case 'stranky': {
      const doc = asDoc<Stranky>(value)
      return doc?.slug ? <PageEmbed doc={doc} siteSlug={siteSlug} /> : null
    }
    case 'kalendar': {
      const doc = asDoc<Kalendar>(value)
      return doc?.slug ? <EventEmbed doc={doc} siteSlug={siteSlug} /> : null
    }
    case 'aktuality': {
      const doc = asDoc<Aktuality>(value)
      return doc?.slug ? <NewsEmbed doc={doc} siteSlug={siteSlug} /> : null
    }
    case 'projekty': {
      const doc = asDoc<Projekty>(value)
      return doc?.slug ? <ProjectEmbed doc={doc} siteSlug={siteSlug} /> : null
    }
    case 'publikace': {
      const doc = asDoc<Publikace>(value)
      return doc?.slug ? <PublicationEmbed doc={doc} siteSlug={siteSlug} /> : null
    }
    case 'lide': {
      const doc = asDoc<Lide>(value)
      return doc?.name ? <PersonEmbed doc={doc} /> : null
    }
    case 'workshopy': {
      const doc = asDoc<Workshopy>(value)
      return doc?.slug ? <WorkshopEmbed doc={doc} siteSlug={siteSlug} /> : null
    }
    default:
      return null
  }
}

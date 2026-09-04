import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

import { resolveColor } from '@/lib/colors'
import { isDocumentHref, isExternalHref } from '@/lib/links'

const VARIANT_CLASS: Record<string, string> = {
  filled: 'btn-filled-ground',
  'filled-ground': 'btn-filled-ground',
  outline: 'btn-outline-cta',
  'filled-sky': 'btn-outline-cta',
  'filled-green': 'btn-signup',
  'outline-ground': 'btn-outline-ground',
  'outline-sky': 'btn-outline-sky',
  colored: 'btn-colored',
}

export function Button({
  backgroundColor,
  children,
  className = '',
  external,
  href,
  icon,
  newTab,
  tag = 'a',
  variant = 'outline',
}: {
  /** Accent fill for `colored` variant (site doplňkové barvy). */
  backgroundColor?: string | null
  children: ReactNode
  className?: string
  /** Force outbound treatment; otherwise auto-detected from href. */
  external?: boolean | null
  href?: string
  icon?: ReactNode
  /** New tab without ↗ (PDF Manifest, etc.). */
  newTab?: boolean | null
  tag?: 'a' | 'span'
  variant?: string | null
}) {
  const resolvedVariant = variant || 'outline'
  const classes = `${VARIANT_CLASS[resolvedVariant] || VARIANT_CLASS.outline} ${className}`.trim()
  const style: CSSProperties | undefined =
    resolvedVariant === 'colored'
      ? ({
          ['--btn-accent' as string]: resolveColor(backgroundColor) || 'var(--color-sky)',
        } as CSSProperties)
      : undefined
  const autoExternal = isExternalHref(href)
  const doc = isDocumentHref(href)
  const treatExternal = external ?? (autoExternal && !doc)
  // Design never auto-adds ↗ when an icon is present (Manifest PDF).
  // Also skip if the label already starts with ↗ (seeded CTAs).
  const childText =
    typeof children === 'string' || typeof children === 'number' ? String(children) : null
  const alreadyArrow = Boolean(childText?.trimStart().startsWith('↗'))
  const label = treatExternal && !icon && !alreadyArrow ? <>↗ {children}</> : children
  const content = icon ? (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-flex size-4 shrink-0 [&_svg]:block [&_svg]:size-full">
        {icon}
      </span>
      {label}
    </span>
  ) : (
    label
  )
  const blank = Boolean(treatExternal || newTab || doc)

  if (tag === 'span') {
    return (
      <span
        className={classes}
        data-component="button"
        data-variant={resolvedVariant}
        style={style}
      >
        {content}
      </span>
    )
  }

  if (blank || !href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) {
    return (
      <a
        className={classes}
        data-component="button"
        data-variant={resolvedVariant}
        href={href || '#'}
        rel={blank ? 'noopener noreferrer' : undefined}
        style={style}
        target={blank ? '_blank' : undefined}
      >
        {content}
      </a>
    )
  }

  return (
    <Link
      className={classes}
      data-component="button"
      data-variant={resolvedVariant}
      href={href}
      style={style}
    >
      {content}
    </Link>
  )
}

const TAG_VARIANT_CLASS: Record<string, string> = {
  soft: 'bg-ground/10 text-ground',
  ground: 'bg-ground/10 text-ground',
  green: 'bg-ground/10 text-ground',
  sky: 'bg-sky/15 text-sky',
}

const TAG_BASE_CLASS =
  'inline-flex h-6 items-center justify-center rounded-full px-3 font-saans text-tag leading-none'

export function Tag({
  children,
  className = '',
  href,
  variant = 'soft',
}: {
  children: ReactNode
  className?: string
  href?: string | null
  variant?: 'soft' | 'sky' | 'ground' | 'green'
}) {
  const classes = `${TAG_BASE_CLASS} ${TAG_VARIANT_CLASS[variant] || TAG_VARIANT_CLASS.soft} ${
    href ? 'no-underline transition-opacity hover:opacity-75' : ''
  } ${className}`.trim()

  if (href) {
    return (
      <Link className={classes} data-component="tag" data-variant={variant} href={href}>
        {children}
      </Link>
    )
  }

  return (
    <span className={classes} data-component="tag" data-variant={variant}>
      {children}
    </span>
  )
}

export type TagItem = string | { href?: string | null; label: string }

function normalizeTagItem(tag: TagItem): { href?: string; label: string } | null {
  if (typeof tag === 'string') return tag ? { label: tag } : null
  if (!tag?.label) return null
  return { label: tag.label, ...(tag.href ? { href: tag.href } : {}) }
}

export function TagGroup({
  className = '',
  muted = false,
  tagClassName = '',
  tags,
  variant = 'soft',
}: {
  className?: string
  muted?: boolean
  tagClassName?: string
  tags: TagItem[]
  variant?: 'soft' | 'sky' | 'ground' | 'green'
}) {
  const items = tags.map(normalizeTagItem).filter((item): item is { href?: string; label: string } => Boolean(item))
  if (!items.length) return null

  return (
    <div
      className={`flex flex-wrap gap-tag ${muted ? 'opacity-50' : ''} ${className}`}
      data-component="tag-group"
    >
      {items.map((item, index) => (
        <Tag
          className={tagClassName}
          href={item.href}
          key={`${item.label}-${index}`}
          variant={variant}
        >
          {item.label}
        </Tag>
      ))}
    </div>
  )
}

export function Divider({ className = '' }: { className?: string }) {
  return (
    <hr
      className={`m-0 w-full border-0 border-t-2 border-ground ${className}`}
      data-component="divider"
      data-orientation="horizontal"
    />
  )
}

export function MetaLine({
  className = '',
  external = false,
  inverted = false,
  source,
  text,
}: {
  className?: string
  external?: boolean
  inverted?: boolean
  source?: string | null
  text?: string | null
}) {
  const parts = [text, source ? `${external ? '↗ ' : ''}${source}` : null].filter(Boolean)
  if (!parts.length) return null

  return (
    <p
      className={`font-saans text-body ${inverted ? 'text-sky' : 'text-ground'} ${className}`}
      data-component="meta-line"
    >
      {parts.join(' · ')}
    </p>
  )
}

export type BlockHeaderAction = {
  backgroundColor?: string | null
  external?: boolean | null
  href?: string | null
  icon?: ReactNode
  label?: string | null
  newTab?: boolean | null
  variant?: string | null
}

export function BlockHeader({
  actionHref,
  actionLabel,
  actions,
  className = '',
  title,
}: {
  actionHref?: string | null
  actionLabel?: string | null
  actions?: BlockHeaderAction[] | null
  className?: string
  title?: string | null
}) {
  if (!title) return null

  const list = actions?.length
    ? actions
    : actionHref && actionLabel
      ? [{ href: actionHref, label: actionLabel, variant: 'outline' }]
      : []

  return (
    <header
      className={`flex flex-col items-center gap-4 py-5 text-center sm:min-h-[73px] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-5 sm:gap-y-4 sm:text-left lg:h-[73px] ${className}`}
      data-component="block-header"
    >
      <h2 className="text-section-title min-w-0 text-ground">{title}</h2>
      {list.length ? (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 sm:justify-end">
          {list.map((action, index) =>
            action.label ? (
              <Button
                backgroundColor={action.backgroundColor}
                className="shrink-0"
                external={action.external}
                href={action.href || '#'}
                icon={action.icon}
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
    </header>
  )
}

import Link from 'next/link'
import type { ReactNode } from 'react'

export type { BlockHeaderAction } from '@/components/frontend/BlockHeader'
export { BlockHeader } from '@/components/frontend/BlockHeader'
export { Button } from '@/components/frontend/Button'

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

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

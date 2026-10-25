'use client'

import type { ReactNode } from 'react'

import { Button } from '@/components/frontend/Button'
import { useOpenForm } from '@/components/frontend/FormModalProvider'
import { resolveColor } from '@/lib/colors'

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

/** Link button or form-modal trigger — same look as `Button`. */
export function FormOrLinkButton({
  backgroundColor,
  children,
  className = '',
  external,
  formId,
  formTitle,
  href,
  icon,
  newTab,
  variant = 'outline',
}: {
  backgroundColor?: string | null
  children: ReactNode
  className?: string
  external?: boolean | null
  formId?: number | string | null
  formTitle?: string | null
  href?: string
  icon?: ReactNode
  newTab?: boolean | null
  variant?: string | null
}) {
  const openForm = useOpenForm()

  if (formId != null && formId !== '') {
    const resolvedVariant = variant || 'outline'
    const classes = `${VARIANT_CLASS[resolvedVariant] || VARIANT_CLASS.outline} ${className}`.trim()
    const style =
      resolvedVariant === 'colored'
        ? ({
            ['--btn-accent' as string]: resolveColor(backgroundColor) || 'var(--color-sky)',
          } as React.CSSProperties)
        : undefined
    const labelText =
      typeof children === 'string' || typeof children === 'number' ? String(children) : null

    return (
      <button
        className={classes}
        data-component="button"
        data-variant={resolvedVariant}
        onClick={() =>
          openForm({
            formId,
            title: formTitle || labelText,
          })
        }
        style={style}
        type="button"
      >
        {icon ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-flex size-4 shrink-0 [&_svg]:block [&_svg]:size-full"
            >
              {icon}
            </span>
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    )
  }

  return (
    <Button
      backgroundColor={backgroundColor}
      className={className}
      external={external}
      href={href}
      icon={icon}
      newTab={newTab}
      variant={variant}
    >
      {children}
    </Button>
  )
}

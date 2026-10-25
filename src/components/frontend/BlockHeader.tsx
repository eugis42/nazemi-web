import type { ReactNode } from 'react'

import { FormOrLinkButton } from '@/components/frontend/FormOrLinkButton'

export type BlockHeaderAction = {
  backgroundColor?: string | null
  external?: boolean | null
  formId?: number | string | null
  formTitle?: string | null
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
  compact = false,
  title,
  titleSize = 'section',
}: {
  actionHref?: string | null
  actionLabel?: string | null
  actions?: BlockHeaderAction[] | null
  className?: string
  /** No bottom pad / fixed height — tighter title→content (e.g. Sloupce). */
  compact?: boolean
  title?: string | null
  /** `section` = 24px block label; `h2` = prose h2 (34px). */
  titleSize?: 'section' | 'h2'
}) {
  if (!title) return null

  const list = actions?.length
    ? actions
    : actionHref && actionLabel
      ? [{ href: actionHref, label: actionLabel, variant: 'outline' }]
      : []

  const titleClass =
    titleSize === 'h2'
      ? 'font-saans text-[34px] font-medium leading-none tracking-[-0.68px]'
      : 'text-section-title'
  // Fixed 73px fits section title; h2 / compact need auto height.
  const heightClass = compact
    ? ''
    : titleSize === 'h2'
      ? 'sm:min-h-[73px]'
      : 'sm:min-h-[73px] lg:h-[73px]'
  const padClass = compact ? 'pt-5 pb-0' : 'py-5'

  return (
    <header
      className={`flex flex-col items-center gap-4 text-center sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-5 sm:gap-y-4 sm:text-left ${padClass} ${heightClass} ${className}`}
      data-component="block-header"
    >
      <h2 className={`${titleClass} min-w-0 text-ground`}>{title}</h2>
      {list.length ? (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 sm:justify-end">
          {list.map((action, index) =>
            action.label ? (
              <FormOrLinkButton
                backgroundColor={action.backgroundColor}
                className="shrink-0"
                external={action.external}
                formId={action.formId}
                formTitle={action.formTitle}
                href={action.href || '#'}
                icon={action.icon}
                key={`${action.label}-${index}`}
                newTab={action.newTab}
                variant={action.variant || 'outline'}
              >
                {action.label}
              </FormOrLinkButton>
            ) : null,
          )}
        </div>
      ) : null}
    </header>
  )
}

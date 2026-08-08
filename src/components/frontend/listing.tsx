import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'

import {
  BreadcrumbSiblingSelect,
  type BreadcrumbSibling,
} from '@/components/frontend/BreadcrumbSiblings'

export type { BreadcrumbSibling }

export type BreadcrumbItem = {
  href: string
  label: string
  siblings?: BreadcrumbSibling[]
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null

  return (
    <nav aria-label="Drobečková navigace" className="breadcrumbs" data-component="breadcrumbs">
      <div className="container">
        <ol className="breadcrumb-list">
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            const siblings =
              index >= 2 && (item.siblings?.length ?? 0) > 1 ? item.siblings ?? null : null
            return (
              <Fragment key={`${item.href}-${index}`}>
                {index > 0 ? (
                  <li aria-hidden="true" className="breadcrumb-sep">
                    <span>/</span>
                  </li>
                ) : null}
                <li className="breadcrumb-item">
                  <Link
                    aria-current={isLast ? 'page' : undefined}
                    className="breadcrumb-link"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                  {siblings ? (
                    <BreadcrumbSiblingSelect
                      href={item.href}
                      label={item.label}
                      siblings={siblings}
                    />
                  ) : null}
                </li>
              </Fragment>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}

export type FilterChip = {
  active?: boolean
  /** Topic chips are multi-select: an active chip clears itself and shows the ✕ affordance. */
  clearable?: boolean
  href: string
  /** Optional leading mark (e.g. collection color dot in search filters). */
  icon?: ReactNode
  label: string
  solid?: boolean
  source?: boolean
}

function FilterChipClearIcon() {
  return (
    <span aria-hidden="true" className="filter-chip-clear">
      <svg
        aria-hidden="true"
        className="filter-chip-clear-icon"
        fill="none"
        viewBox="0 0 10 10"
      >
        <path
          d="M2.5 2.5 7.5 7.5M7.5 2.5 2.5 7.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.25"
        />
      </svg>
    </span>
  )
}

export function FilterBar({
  ariaLabel = 'Filtrovat',
  groups,
}: {
  ariaLabel?: string
  groups: FilterChip[][]
}) {
  const visible = groups.filter((group) => group.length)
  if (!visible.length) return null

  const renderChip = (chip: FilterChip, index: number) => {
    const showClear = Boolean(chip.active && chip.clearable)
    const modifier = chip.source ? ' btn-filter-source' : chip.solid ? ' btn-filter-solid' : ''

    return (
      <Link
        aria-pressed={chip.active ? 'true' : 'false'}
        className={`${chip.active ? 'btn-filter-active' : 'btn-filter'}${modifier}${
          chip.icon ? ' gap-1.5' : ''
        }${showClear ? ' relative group overflow-visible' : ''}`}
        data-filter-kind={chip.source ? 'source' : undefined}
        href={chip.href}
        key={`${chip.label}-${index}`}
      >
        {chip.icon ? (
          <span aria-hidden="true" className="inline-flex shrink-0 items-center">
            {chip.icon}
          </span>
        ) : null}
        {chip.label}
        {showClear ? <FilterChipClearIcon /> : null}
      </Link>
    )
  }

  return (
    <div aria-label={ariaLabel} data-component="event-filter-bar" role="toolbar">
      <div className="flex flex-col gap-2 py-2 lg:hidden" data-filter-layout="mobile">
        {visible.map((group, groupIndex) => (
          <div key={`m-${groupIndex}`}>
            {groupIndex > 0 ? (
              <span aria-hidden="true" className="filter-bar-divider-horizontal" />
            ) : null}
            <div className="flex flex-wrap items-center gap-2" data-component="filter-bar-stack">
              {group.map(renderChip)}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden flex-wrap items-center gap-2 py-2 lg:flex" data-filter-layout="desktop">
        {visible.map((group, groupIndex) => (
          <div className="contents" key={`d-${groupIndex}`}>
            {groupIndex > 0 ? <span aria-hidden="true" className="filter-bar-divider" /> : null}
            {group.map(renderChip)}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Pagination({
  buildHref,
  currentPage,
  totalPages,
}: {
  buildHref: (page: number) => string
  currentPage: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  const prevDisabled = currentPage <= 1
  const nextDisabled = currentPage >= totalPages

  const step = (label: string, ariaLabel: string, disabled: boolean, target: number) =>
    disabled ? (
      <button
        aria-label={ariaLabel}
        className="btn-pagination pointer-events-none opacity-40"
        disabled
        type="button"
      >
        {label}
      </button>
    ) : (
      <Link aria-label={ariaLabel} className="btn-pagination" href={buildHref(target)}>
        {label}
      </Link>
    )

  return (
    <nav
      aria-label="Stránkování"
      className="flex flex-wrap items-center justify-center gap-2.5 py-5"
      data-component="pagination"
      data-pagination
      data-total-pages={totalPages}
    >
      {step('←', 'Předchozí strana', prevDisabled, currentPage - 1)}
      {pages.map((page) => (
        <Link
          aria-current={page === currentPage ? 'page' : undefined}
          aria-label={`Strana ${page}`}
          className={page === currentPage ? 'btn-pagination-active' : 'btn-pagination'}
          href={buildHref(page)}
          key={page}
        >
          {page}
        </Link>
      ))}
      {step('→', 'Další strana', nextDisabled, currentPage + 1)}
    </nav>
  )
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-body-inter py-8 text-center">{children}</p>
}

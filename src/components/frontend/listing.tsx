import Link from 'next/link'
import { Fragment } from 'react'

import {
  BreadcrumbSiblingSelect,
  type BreadcrumbSibling,
} from '@/components/frontend/BreadcrumbSiblings'

export type { BreadcrumbSibling }
export type { FilterChip, FilterSection } from '@/components/frontend/FilterBar'
export { FilterBar } from '@/components/frontend/FilterBar'

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

  const pages = paginationWindow(currentPage, totalPages)
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
      {pages.map((page, index) =>
        page === 'ellipsis' ? (
          <span
            aria-hidden="true"
            className="btn-pagination-ellipsis"
            key={`ellipsis-${index}`}
          >
            <svg
              aria-hidden="true"
              className="btn-pagination-ellipsis-dots"
              fill="currentColor"
              height="16"
              viewBox="0 0 16 16"
              width="16"
            >
              <circle cx="2" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="14" cy="8" r="1.5" />
            </svg>
          </span>
        ) : (
          <Link
            aria-current={page === currentPage ? 'page' : undefined}
            aria-label={`Strana ${page}`}
            className={page === currentPage ? 'btn-pagination-active' : 'btn-pagination'}
            href={buildHref(page)}
            key={page}
          >
            {page}
          </Link>
        ),
      )}
      {step('→', 'Další strana', nextDisabled, currentPage + 1)}
    </nav>
  )
}

/** First + last + current ± siblings; ellipsis when the gap is bigger than 1. */
function paginationWindow(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
): Array<number | 'ellipsis'> {
  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i)

  // first, last, current, 2×siblings, 2×ellipsis slots
  const maxButtons = siblingCount * 2 + 5
  if (totalPages <= maxButtons) return range(1, totalPages)

  const left = Math.max(currentPage - siblingCount, 1)
  const right = Math.min(currentPage + siblingCount, totalPages)
  const showLeftEllipsis = left > 2
  const showRightEllipsis = right < totalPages - 1

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftCount = 3 + siblingCount * 2
    return [...range(1, leftCount), 'ellipsis', totalPages]
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightCount = 3 + siblingCount * 2
    return [1, 'ellipsis', ...range(totalPages - rightCount + 1, totalPages)]
  }

  return [1, 'ellipsis', ...range(left, right), 'ellipsis', totalPages]
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-body-inter py-8 text-center text-ground">{children}</p>
}

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

'use client'

import Link from 'next/link'
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { FilterIcon, FilterOffIcon } from '@/components/frontend/icons'

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

export type FilterSection = {
  chips: FilterChip[]
  label: string
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

function renderChip(chip: FilterChip, index: number) {
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

function FilterToggleButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const openFaceRef = useRef<HTMLSpanElement>(null)
  const closeFaceRef = useRef<HTMLSpanElement>(null)
  const [stackWidth, setStackWidth] = useState<number | null>(null)

  const syncWidth = useCallback(() => {
    const active = open ? closeFaceRef.current : openFaceRef.current
    if (!active) return
    setStackWidth(Math.ceil(active.getBoundingClientRect().width))
  }, [open])

  useLayoutEffect(() => {
    syncWidth()
  }, [syncWidth])

  useLayoutEffect(() => {
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            syncWidth()
          })
        : null
    if (openFaceRef.current) ro?.observe(openFaceRef.current)
    if (closeFaceRef.current) ro?.observe(closeFaceRef.current)
    window.addEventListener('resize', syncWidth)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', syncWidth)
    }
  }, [syncWidth])

  return (
    <button
      aria-controls="listing-filter-panel"
      aria-expanded={open}
      className="btn-filter filter-toggle cursor-pointer border-0 sm:ml-auto"
      data-open={open ? 'true' : 'false'}
      onClick={onToggle}
      type="button"
    >
      <span
        aria-hidden="true"
        className="filter-toggle-stack"
        style={stackWidth != null ? { width: stackWidth } : undefined}
      >
        <span className="filter-toggle-face" data-face="open" ref={openFaceRef}>
          <FilterIcon />
          Filtrovat
        </span>
        <span className="filter-toggle-face" data-face="close" ref={closeFaceRef}>
          <FilterOffIcon />
          Zavřít filtr
        </span>
      </span>
      <span className="sr-only">{open ? 'Zavřít filtr' : 'Filtrovat'}</span>
    </button>
  )
}

/**
 * Primary chips stay visible (Vše / Nadcházející–Minulé).
 * Secondary sections collapse behind „Filtrovat“.
 */
export function FilterBar({
  ariaLabel = 'Filtrovat',
  primary,
  sections = [],
}: {
  ariaLabel?: string
  primary: FilterChip[]
  sections?: FilterSection[]
}) {
  const visibleSections = sections.filter((section) => section.chips.length)
  const hasActiveSecondary = visibleSections.some((section) =>
    section.chips.some((chip) => chip.active),
  )
  const [open, setOpen] = useState(hasActiveSecondary)

  if (!primary.length && !visibleSections.length) return null

  return (
    <div aria-label={ariaLabel} className="flex flex-col py-2" data-component="event-filter-bar">
      <div
        className="flex flex-wrap items-center gap-2 sm:justify-between"
        data-component="filter-bar-primary"
        role="toolbar"
      >
        <div className="contents sm:flex sm:min-w-0 sm:flex-wrap sm:items-center sm:gap-2">
          {primary.map(renderChip)}
        </div>
        {visibleSections.length ? (
          <FilterToggleButton open={open} onToggle={() => setOpen((value) => !value)} />
        ) : null}
      </div>

      {visibleSections.length ? (
        <div
          aria-hidden={!open}
          className="filter-panel"
          data-component="filter-bar-panel"
          data-open={open ? 'true' : 'false'}
          id="listing-filter-panel"
        >
          <div className="filter-panel-inner" {...(!open ? { inert: true } : {})}>
            <div className="filter-panel-content flex flex-col gap-4 pt-3">
              {visibleSections.map((section, index) => (
                <div
                  className="filter-panel-section flex flex-col gap-1.5"
                  key={section.label}
                  style={{ ['--filter-section-i' as string]: index }}
                >
                  <p className="m-0 font-saans text-tag leading-none text-ground/70">{section.label}</p>
                  <div className="flex flex-wrap items-center gap-2" role="toolbar">
                    {section.chips.map(renderChip)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

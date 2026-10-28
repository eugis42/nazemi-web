'use client'

import { useRouter } from 'next/navigation'

import { ArrowsSortIcon } from '@/components/frontend/icons'

export type ListingSortOption = {
  href: string
  label: string
  value: string
}

/**
 * Sort control — icon + current order label; native `<select>` for the menu.
 * Sits next to Filtrovat on listing toolbars.
 */
export function ListingSortControl({
  current,
  options,
}: {
  current: ListingSortOption
  options: ListingSortOption[]
}) {
  const router = useRouter()
  const selected = options.some((option) => option.value === current.value)
    ? current.value
    : options[0]?.value
  const label =
    options.find((option) => option.value === selected)?.label || current.label

  return (
    <label
      className="btn-filter relative cursor-pointer overflow-hidden border-0"
      data-component="listing-sort"
    >
      <span aria-hidden="true" className="pointer-events-none inline-flex items-center gap-1.5">
        <ArrowsSortIcon />
        <span>{label}</span>
      </span>
      <select
        aria-label="Pořadí"
        className="absolute inset-0 z-10 cursor-pointer opacity-0"
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value)
          if (next?.href) router.push(next.href)
        }}
        value={selected}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

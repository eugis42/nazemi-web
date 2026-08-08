'use client'

import { useRouter } from 'next/navigation'

export type BreadcrumbSibling = {
  href: string
  label: string
}

/** Port of the design `breadcrumbs.js` sibling picker — circular button over a native select. */
export function BreadcrumbSiblingSelect({
  href,
  label,
  siblings,
}: {
  href: string
  label: string
  siblings: BreadcrumbSibling[]
}) {
  const router = useRouter()
  const selected = siblings.some((sibling) => sibling.href === href) ? href : siblings[0].href

  return (
    <label className="breadcrumb-sibling">
      <span aria-hidden="true" className="breadcrumb-sibling-btn">
        <svg
          aria-hidden="true"
          fill="none"
          height="16"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M8 9l4 -4l4 4" />
          <path d="M16 15l-4 4l-4 -4" />
        </svg>
      </span>
      <select
        aria-label={`Související stránky: ${label}`}
        className="breadcrumb-sibling-select"
        onChange={(event) => {
          if (event.target.value) router.push(event.target.value)
        }}
        value={selected}
      >
        {siblings.map((sibling) => (
          <option key={sibling.href} value={sibling.href}>
            {sibling.label}
          </option>
        ))}
      </select>
    </label>
  )
}

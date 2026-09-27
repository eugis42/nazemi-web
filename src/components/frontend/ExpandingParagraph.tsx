import type { ReactNode } from 'react'

type ExpandingParagraphProps = {
  body: ReactNode
  summary: string
}

/**
 * Accessible expand/collapse — native `<details>` (no JS).
 * Used by Lexical `expandingParagraph` block converter.
 */
export function ExpandingParagraph({ body, summary }: ExpandingParagraphProps) {
  const label = summary.trim()
  if (!label) return null

  return (
    <details className="rt-expand not-prose my-6 w-full" data-rt-block="expandingParagraph">
      <summary className="rt-expand__summary">
        <span className="rt-expand__label">{label}</span>
        <span aria-hidden="true" className="rt-expand__arrow">
          <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3.5 6.25 8 10.75l4.5-4.5"
              stroke="currentColor"
              strokeLinecap="square"
              strokeWidth="1.5"
            />
          </svg>
        </span>
      </summary>
      <div className="rt-expand__body prose-nazemi">{body}</div>
    </details>
  )
}

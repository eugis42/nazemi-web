import { CameraIcon } from '@/components/frontend/icons'

/**
 * Tiny photo-credit chip — bottom-right overlay on a `relative` image frame.
 * Empty authorship → render nothing.
 */
export function MediaAuthorshipTag({
  authorship,
  className = '',
  large = false,
}: {
  authorship?: string | null
  /** Extra classes on the outer chip (e.g. z-index). */
  className?: string
  /** Heroes / covers — slightly more inset. */
  large?: boolean
}) {
  const text = typeof authorship === 'string' ? authorship.trim() : ''
  if (!text) return null

  const inset = large ? 'bottom-3 right-3' : 'bottom-2 right-2'

  return (
    <span
      className={`pointer-events-none absolute ${inset} z-10 flex max-w-[min(100%-1rem,18rem)] items-center gap-1 rounded-full bg-ground/55 px-2 py-0.5 font-inter text-[10px] leading-none tracking-wide text-sky ${className}`}
      data-component="media-authorship"
    >
      <CameraIcon className="size-2.5 shrink-0" />
      <span className="min-w-0 truncate">{text}</span>
    </span>
  )
}

import type { Media } from '@/payload-types'
import { Button } from '@/components/frontend/ui'
import { mediaAlt, mediaFocalStyle, mediaSizeURL, mediaURL } from '@/lib/content'

export type ExternalLinkCardData = {
  buttonLabel?: string | null
  description?: string | null
  image?: unknown
  title?: string | null
  url?: string | null
  [key: string]: unknown
}

/**
 * Stored OG card — no live scrape. Looks like vztahy news/page embeds.
 */
export function ExternalLinkCardView({ block }: { block: ExternalLinkCardData }) {
  const href = typeof block.url === 'string' ? block.url.trim() : ''
  const title = typeof block.title === 'string' ? block.title.trim() : ''
  if (!href || !title) return null

  const description =
    typeof block.description === 'string' && block.description.trim()
      ? block.description.trim()
      : null
  const image = block.image && typeof block.image === 'object' ? (block.image as Media) : null
  const imageSrc = image ? mediaSizeURL(image, 'landscape') || mediaURL(image) : null
  const buttonLabel =
    typeof block.buttonLabel === 'string' && block.buttonLabel.trim()
      ? block.buttonLabel.trim()
      : 'Otevřít'

  let host = ''
  try {
    host = new URL(href).hostname.replace(/^www\./, '')
  } catch {
    host = ''
  }

  return (
    <article
      className="not-prose relative flex w-full min-w-0 max-w-full items-stretch gap-0 overflow-hidden bg-ground/5"
      data-component="external-link-card"
    >
      <a
        aria-label={title}
        className="absolute inset-0 z-0"
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      />
      {imageSrc ? (
        <div
          className="pointer-events-none relative z-[1] w-40 shrink-0 self-stretch overflow-hidden sm:w-48"
          data-embed-aspect="landscape"
          data-embed-media
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={mediaAlt(image, title)}
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            src={imageSrc}
            style={mediaFocalStyle(image)}
          />
        </div>
      ) : null}
      <div className="pointer-events-none relative z-[1] flex min-w-0 flex-1 flex-col items-start gap-3 p-[15px]">
        {host ? (
          <span className="font-saans text-tag leading-tight tracking-wide text-ground/60">
            ↗ {host}
          </span>
        ) : null}
        <span className="font-saans text-card-title leading-none text-ground">{title}</span>
        {description ? (
          <p className="text-body-inter line-clamp-3 text-ground/80">{description}</p>
        ) : null}
        <div className="pointer-events-auto relative z-[1] mt-auto flex flex-wrap gap-2.5 pt-1">
          <Button external href={href} variant="outline-ground">
            {buttonLabel}
          </Button>
        </div>
      </div>
    </article>
  )
}

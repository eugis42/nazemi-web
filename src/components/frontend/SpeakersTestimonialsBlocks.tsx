import type { Media } from '@/payload-types'
import { mediaAlt, mediaFocalStyle, mediaSizeURL } from '@/lib/content'

/** Minimal block shape — kept local to avoid importing BlockRenderers (circular with NazemiRichText). */
export type PeopleBlockData = {
  id?: string
  people?: unknown
  title?: unknown
  [key: string]: unknown
}

export type TestimonialsBlockData = {
  id?: string
  items?: unknown
  title?: unknown
  [key: string]: unknown
}

type SpeakersPeople = { name?: string; role?: string; image?: unknown; quote?: string }[]
type TestimonialItems = { quote?: string; author?: string; role?: string }[]

/**
 * Lidé / Reference layout:
 * - Off homepage (`fullWidth` false): always prose column (`max-w-[874px]`), centered.
 * - Homepage (`fullWidth` true): no prose cap — same full width as other homepage blocks.
 * - `bare`: skip outer `.container` when parent already wraps (HomepageBlocks).
 */
export function SpeakersBlockView({
  block,
  bare = false,
  fullWidth = false,
}: {
  block: PeopleBlockData
  bare?: boolean
  fullWidth?: boolean
}) {
  const people = (block.people as SpeakersPeople) || []
  if (!people.length) return null
  const title =
    typeof block.title === 'string' && block.title.trim() ? block.title : 'Lidé'
  // 1: lg 3-col track so single card doesn’t stretch. 2+: same sm:2 as 3+ so a pair
  // stays on one row whenever a 3-entry block still shows two across.
  const gridClass =
    people.length === 1
      ? 'grid grid-cols-1 gap-grid lg:grid-cols-3'
      : 'grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-3'
  const section = (
    <section
      className={`flex flex-col gap-grid${fullWidth ? '' : ' mx-auto w-full max-w-[874px]'}`}
      data-block="workshop-speakers"
      data-count={people.length}
      data-layout={fullWidth ? 'full' : 'prose'}
    >
      <h2 className="text-section-title text-ground">{title}</h2>
      <div className={gridClass}>
        {people.map((person, personIndex) => {
          const img =
            person.image && typeof person.image === 'object' ? (person.image as Media) : null
          const imgUrl = img ? mediaSizeURL(img, 'thumb') : null
          const initials = (person.name || '')
            .split(/\s+/)
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
          const quote =
            typeof person.quote === 'string' && person.quote.trim() ? person.quote.trim() : null
          return (
            <article
              className="flex flex-col gap-3"
              data-component="workshop-speaker"
              key={`${person.name}-${personIndex}`}
            >
              <div className="flex gap-4">
                {imgUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={mediaAlt(img, person.name || '')}
                    className="size-20 shrink-0 rounded-full border-2 border-ground object-cover"
                    loading="lazy"
                    src={imgUrl}
                    style={mediaFocalStyle(img)}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-ground bg-green font-saans text-xl leading-none text-ground"
                  >
                    {initials}
                  </div>
                )}
                <div className="flex min-w-0 flex-col justify-center gap-1">
                  <h3 className="text-card-title text-ground">{person.name}</h3>
                  {person.role ? <p className="text-body-inter text-ground">{person.role}</p> : null}
                </div>
              </div>
              {quote ? <p className="text-body-inter text-ground">{quote}</p> : null}
            </article>
          )
        })}
      </div>
    </section>
  )
  if (bare) return section
  return <div className="container max-lg:px-card">{section}</div>
}

export function TestimonialsBlockView({
  block,
  bare = false,
  fullWidth = false,
}: {
  block: TestimonialsBlockData
  bare?: boolean
  fullWidth?: boolean
}) {
  const items = (block.items as TestimonialItems) || []
  if (!items.length) return null
  const title =
    typeof block.title === 'string' && block.title.trim()
      ? block.title
      : 'Co o workshopu říkají'
  // Quotes stretch within available width. Homepage 3+: up to 4 cols; prose stays ≤2.
  const n = items.length
  const gridClass =
    n === 1
      ? 'grid min-w-0 grid-cols-1 gap-grid'
      : n === 2
        ? 'grid min-w-0 grid-cols-1 gap-grid lg:grid-cols-2 lg:gap-10'
        : fullWidth
          ? 'grid min-w-0 grid-cols-1 gap-grid lg:grid-cols-2 lg:gap-10 xl:grid-cols-4'
          : 'grid min-w-0 grid-cols-1 gap-grid lg:grid-cols-2 lg:gap-10'
  const section = (
    <section
      className={`flex flex-col gap-grid${fullWidth ? '' : ' mx-auto w-full max-w-[874px]'}`}
      data-block="workshop-testimonials"
      data-count={items.length}
      data-layout={fullWidth ? 'full' : 'prose'}
    >
      <h2 className="text-section-title text-ground">{title}</h2>
      <div className={gridClass}>
        {items.map((item, itemIndex) => (
          <blockquote
            className="flex h-full flex-col gap-3 text-ground"
            data-component="workshop-testimonial"
            key={`${item.author}-${itemIndex}`}
          >
            <p className="font-serif text-xl font-normal leading-snug tracking-tight text-ground">
              „{item.quote}“
            </p>
            <footer className="font-saans mt-auto text-sm leading-snug text-ground/70">
              <cite className="not-italic">
                {item.author}
                {item.role ? ` · ${item.role}` : ''}
              </cite>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  )
  if (bare) return section
  return <div className="container max-lg:px-card">{section}</div>
}

import { SearchIcon } from '@/components/frontend/icons'
import { withSiteQuery } from '@/lib/content'
import Link from 'next/link'
import { formatDate, formatDateRange } from '@/lib/format'
import { highlightText, snippetAroundQuery } from '@/lib/highlight'
import {
  type SiteContentCollectionSlug,
  siteContentPath,
} from '@/lib/live-preview'

export const SEARCH_TYPE_LABELS: Record<SiteContentCollectionSlug | string, string> = {
  aktuality: 'Aktualita',
  kalendar: 'Událost',
  projekty: 'Projekt',
  publikace: 'Publikace',
  stranky: 'Stránka',
  workshopy: 'Workshop',
}

/** Brand accents for collection colour coding (circle on tags/filters). */
export const SEARCH_TYPE_DOT: Record<string, string> = {
  '': 'bg-gray',
  aktuality: 'bg-blue',
  kalendar: 'bg-orange',
  projekty: 'bg-green',
  publikace: 'bg-violet',
  stranky: 'bg-brown',
  workshopy: 'bg-turquoise',
}

export const SEARCH_TYPE_FILTERS: { label: string; value: string }[] = [
  { label: 'Vše', value: '' },
  { label: 'Stránky', value: 'stranky' },
  { label: 'Aktuality', value: 'aktuality' },
  { label: 'Kalendář', value: 'kalendar' },
  { label: 'Projekty', value: 'projekty' },
  { label: 'Workshopy', value: 'workshopy' },
  { label: 'Publikace', value: 'publikace' },
]

export type SearchResultItem = {
  authorName?: string | null
  collectionSlug?: string | null
  docSlug?: string | null
  endDate?: string | null
  eventIsPast?: boolean | null
  excerpt?: string | null
  id: number | string
  publishedAt?: string | null
  startDate?: string | null
  title?: string | null
}

export function SearchTypeDot({
  collection,
  className = '',
}: {
  collection: string
  className?: string
}) {
  const color = SEARCH_TYPE_DOT[collection] || SEARCH_TYPE_DOT['']
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2.5 shrink-0 rounded-full ${color} ${className}`.trim()}
      data-search-type={collection || 'all'}
    />
  )
}

/** Shared shell for result badges (collection + “Již proběhlo”). */
const SEARCH_BADGE_CLASS =
  'inline-flex h-6 items-center rounded-full border font-saans text-tag leading-none'

export function SearchTypeTag({
  collection,
  label,
}: {
  collection: string
  label: string
}) {
  return (
    <span
      className={`${SEARCH_BADGE_CLASS} items-stretch border-transparent bg-ground/10 pr-2.5 text-ground`}
      data-component="search-type-tag"
      data-search-type={collection || 'all'}
    >
      {/* Square = tag height → centres dot in left border-radius. */}
      <span className="inline-flex aspect-square h-full w-6 shrink-0 items-center justify-center">
        <SearchTypeDot collection={collection} />
      </span>
      <span className="inline-flex items-center">{label}</span>
    </span>
  )
}

/** Filter chip: identical left-radius geometry to SearchTypeTag. */
export function SearchTypeFilterChip({
  active,
  collection,
  count,
  disabled,
  href,
  label,
}: {
  active?: boolean
  collection: string
  count: number
  disabled?: boolean
  href: string
  label: string
}) {
  const className = [
    'inline-flex h-6 items-stretch rounded-full font-saans text-tag leading-none no-underline transition-colors duration-150 ease-out pr-2.5',
    disabled
      ? 'cursor-not-allowed bg-ground/5 text-ground/35'
      : active
        ? 'bg-ground text-sky'
        : 'bg-ground/10 text-ground hover:bg-ground/20',
  ].join(' ')

  const body = (
    <>
      <span className="inline-flex aspect-square h-full w-6 shrink-0 items-center justify-center">
        <SearchTypeDot
          className={disabled ? 'opacity-40' : ''}
          collection={collection}
        />
      </span>
      <span className="inline-flex items-center gap-1">
        <span>{label}</span>
        <span
          className={`ligatures-none [font-feature-settings:'liga'_0,'clig'_0,'calt'_0,'dlig'_0] ${disabled ? 'text-ground/30' : active ? 'text-sky/70' : 'text-ground/55'}`}
        >
          {'(\u200B'}
          {count}
          {'\u200B)'}
        </span>
      </span>
    </>
  )

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={className}
        data-component="search-type-filter-chip"
        data-search-type={collection || 'all'}
        title="Žádné výsledky"
      >
        {body}
      </span>
    )
  }

  return (
    <Link
      aria-pressed={active ? 'true' : 'false'}
      className={className}
      data-component="search-type-filter-chip"
      data-search-type={collection || 'all'}
      href={href}
    >
      {body}
    </Link>
  )
}

export function SearchTypeFilterBar({
  chips,
}: {
  chips: {
    active?: boolean
    collection: string
    count: number
    disabled?: boolean
    href: string
    label: string
  }[]
}) {
  if (!chips.length) return null
  return (
    <div
      aria-label="Filtrovat typy výsledků"
      className="flex flex-wrap items-center gap-2 py-2"
      data-component="search-type-filter-bar"
      role="toolbar"
    >
      {chips.map((chip) => (
        <SearchTypeFilterChip
          active={chip.active}
          collection={chip.collection}
          count={chip.count}
          disabled={chip.disabled}
          href={chip.href}
          key={`${chip.collection}-${chip.label}`}
          label={chip.label}
        />
      ))}
    </div>
  )
}

function isPastEvent(item: SearchResultItem, now = Date.now()) {
  const end = item.endDate || item.startDate
  if (!end) return Boolean(item.eventIsPast)
  const date = new Date(end)
  if (Number.isNaN(date.getTime())) return Boolean(item.eventIsPast)
  return date.getTime() < now
}

function resultHref(item: SearchResultItem, siteSlug: string) {
  const collection = (item.collectionSlug || 'stranky') as SiteContentCollectionSlug
  const path = siteContentPath(collection, { slug: item.docSlug || '' })
  return withSiteQuery(path, siteSlug)
}

function metaLine(item: SearchResultItem) {
  const parts: string[] = []
  if (item.collectionSlug === 'kalendar') {
    const range = formatDateRange(item.startDate, item.endDate)
    if (range) parts.push(range)
  } else if (item.publishedAt) {
    const date = formatDate(item.publishedAt)
    if (date) parts.push(date)
  }
  if (item.authorName) parts.push(item.authorName)
  return parts.join(' · ')
}

export function SearchResultRow({
  item,
  query,
  siteSlug,
}: {
  item: SearchResultItem
  query: string
  siteSlug: string
}) {
  const collection = item.collectionSlug || 'stranky'
  const label = SEARCH_TYPE_LABELS[collection] || 'Výsledek'
  const past = collection === 'kalendar' && isPastEvent(item)
  const href = resultHref(item, siteSlug)
  const title = item.title || 'Bez názvu'
  const snippet = snippetAroundQuery(item.excerpt || '', query)
  const meta = metaLine(item)

  return (
    <article
      className="flex flex-col gap-3 border-b-2 border-dotted border-ground py-8 last:border-b-0"
      data-component="search-result-row"
      data-past={past ? 'true' : undefined}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SearchTypeTag collection={collection} label={label} />
          {past ? (
            <span className={`${SEARCH_BADGE_CLASS} border-ground/40 px-3 text-ground/70`}>
              Již proběhlo
            </span>
          ) : null}
        </div>
        <h2 className="font-saans text-section-title text-ground">
          <a className="no-underline hover:underline" href={href}>
            {highlightText(title, query)}
          </a>
        </h2>
        {snippet ? (
          <p className="text-body-inter text-ground/80">{highlightText(snippet, query)}</p>
        ) : null}
        {meta ? <p className="font-saans text-sm text-ground/70">{meta}</p> : null}
      </div>
    </article>
  )
}

export function SearchForm({
  q,
  siteSlug,
  type,
}: {
  q: string
  siteSlug: string
  type: string
}) {
  return (
    <form
      action={withSiteQuery('/hledat', siteSlug)}
      className="w-full"
      data-component="search-form"
      method="get"
      role="search"
    >
      {siteSlug !== 'nazemi' ? <input name="site" type="hidden" value={siteSlug} /> : null}
      {type ? <input name="type" type="hidden" value={type} /> : null}
      <label className="absolute -left-[9999px]" htmlFor="hledat-q">
        Hledaný výraz
      </label>
      <div className="flex w-full items-stretch border-2 border-ground bg-sky focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ground">
        <input
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="min-h-16 w-full min-w-0 flex-1 border-0 bg-transparent px-4 py-3 font-saans text-[22px] leading-tight tracking-[-0.4px] text-ground placeholder:text-ground/45 focus-visible:outline-none md:min-h-[4.5rem] md:px-5 md:text-card-title md:tracking-[-0.52px] [&::-webkit-search-cancel-button]:appearance-none"
          defaultValue={q}
          enterKeyHint="search"
          id="hledat-q"
          inputMode="search"
          name="q"
          placeholder="Hledat na webu…"
          spellCheck={false}
          type="search"
        />
        {/* Mobile: icon-only 48px tap target inside field. Desktop: labelled CTA. */}
        <div className="flex shrink-0 items-center p-1.5 md:p-2">
          <button
            aria-label="Hledat"
            className="inline-flex size-12 items-center justify-center rounded-full border-2 border-ground bg-ground font-saans text-body leading-none text-sky transition-colors duration-150 ease-out hover:bg-sky hover:text-ground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ground active:bg-sky active:text-ground md:h-12 md:w-auto md:gap-2 md:px-5"
            type="submit"
          >
            <span className="md:hidden">
              <SearchIcon />
            </span>
            <span className="hidden md:inline">Hledat</span>
          </button>
        </div>
      </div>
    </form>
  )
}

'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import type { LogoStripAlign, LogoStripItem } from '@/lib/logo-strip'
import { isExternalHref } from '@/lib/links'

const GAP_PX = 40 // gap-10 — equal space between logo edges (inline-block feel)
const MAX_LOGO_W = 160
const MAX_LOGO_H = 56

/** Split n items into rows so counts stay as even as possible. */
function balanceRowCounts(n: number, maxPerRow: number): number[] {
  if (n <= 0) return []
  const cap = Math.max(1, maxPerRow)
  if (n <= cap) return [n]
  const rows = Math.ceil(n / cap)
  const base = Math.floor(n / rows)
  let rem = n % rows
  const counts = Array.from({ length: rows }, () => base)
  for (let i = 0; i < rem; i++) counts[i]!++
  return counts
}

/** Greedy wrap like flex-wrap, then prefer even counts when they still fit. */
function planRows(widths: number[], containerWidth: number, gap: number): number[][] {
  const n = widths.length
  if (!n) return []
  if (containerWidth <= 0) return [widths.map((_, i) => i)]

  const pack = (counts: number[]): number[][] | null => {
    const rows: number[][] = []
    let i = 0
    for (const count of counts) {
      const idxs = Array.from({ length: count }, (_, k) => i + k)
      const rowW =
        idxs.reduce((sum, idx) => sum + (widths[idx] || 0), 0) + gap * Math.max(0, count - 1)
      if (rowW > containerWidth + 1) return null
      rows.push(idxs)
      i += count
    }
    return rows
  }

  // Greedy: how many rows / max per row flex would need
  const greedy: number[][] = []
  let row: number[] = []
  let used = 0
  for (let i = 0; i < n; i++) {
    const w = widths[i] || 0
    const need = row.length === 0 ? w : used + gap + w
    if (row.length && need > containerWidth) {
      greedy.push(row)
      row = [i]
      used = w
    } else {
      row.push(i)
      used = need
    }
  }
  if (row.length) greedy.push(row)

  const maxPer = Math.max(...greedy.map((r) => r.length), 1)
  const balanced = pack(balanceRowCounts(n, maxPer))
  return balanced ?? greedy
}

function LogoCell({ logo }: { logo: LogoStripItem }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={logo.alt}
      className="h-12 w-auto max-h-14 max-w-[160px] object-contain object-left lg:h-14"
      height={MAX_LOGO_H}
      loading="lazy"
      src={logo.url}
      width={MAX_LOGO_W}
    />
  )
  // Shrink-to-content — gaps are between real logo edges, not fixed columns.
  const slot = 'inline-flex h-14 shrink-0 items-center lg:h-16'
  if (logo.href) {
    const external = isExternalHref(logo.href)
    return (
      <li className={slot}>
        <a
          className="inline-flex h-full items-center transition-opacity duration-150 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ground"
          href={logo.href}
          rel={external ? 'noopener noreferrer' : undefined}
          target={external ? '_blank' : undefined}
        >
          {img}
        </a>
      </li>
    )
  }
  return <li className={slot}>{img}</li>
}

type LogoStripProps = {
  align?: LogoStripAlign | null
  logos: LogoStripItem[]
  title?: string | null
}

/**
 * Partner logos as inline flex items (natural width + equal gap), not table columns.
 * Multi-line: balance item counts when the balanced plan still fits.
 */
export function LogoStrip({ align: alignProp, logos: raw, title }: LogoStripProps) {
  const logos = raw.filter((item) => Boolean(item.url))
  const align: LogoStripAlign = alignProp === 'center' ? 'center' : 'left'
  const trackRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLUListElement>(null)
  const [rowIndexes, setRowIndexes] = useState<number[][] | null>(null)

  const relayout = () => {
    const track = trackRef.current
    const measure = measureRef.current
    if (!track || !measure) return
    const items = [...measure.querySelectorAll<HTMLElement>('[data-logo-measure]')]
    if (items.length !== logos.length) return
    const widths = items.map((el) => el.getBoundingClientRect().width)
    const containerWidth = track.clientWidth
    setRowIndexes(planRows(widths, containerWidth, GAP_PX))
  }

  useLayoutEffect(() => {
    relayout()
    // Images may load late and change intrinsic width.
    const measure = measureRef.current
    if (!measure) return undefined
    const imgs = [...measure.querySelectorAll('img')]
    for (const img of imgs) {
      if (!img.complete) img.addEventListener('load', relayout)
    }
    const ro = new ResizeObserver(() => relayout())
    if (trackRef.current) ro.observe(trackRef.current)
    return () => {
      for (const img of imgs) img.removeEventListener('load', relayout)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- relayout closes over logos.length
  }, [logos.length, align])

  useEffect(() => {
    // Fallback if layout effect ran before fonts/images settled.
    const t = window.setTimeout(relayout, 100)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logos.length])

  if (!logos.length) return null

  const rows: LogoStripItem[][] =
    rowIndexes?.map((idxs) => idxs.map((i) => logos[i]!).filter(Boolean)) ?? [logos]

  return (
    <section className="w-full" data-align={align} data-block="logoStrip">
      {title?.trim() ? (
        <h2
          className={`font-saans mb-6 text-[20px] font-medium leading-none tracking-tight text-ground lg:text-[24px] ${align === 'center' ? 'text-center' : 'text-left'}`}
        >
          {title.trim()}
        </h2>
      ) : null}

      <div className="relative w-full" ref={trackRef}>
        {/* Off-flow measure strip: natural widths for packing math */}
        <ul
          aria-hidden
          className="pointer-events-none invisible absolute inset-x-0 top-0 flex flex-wrap"
          ref={measureRef}
          style={{ gap: GAP_PX }}
        >
          {logos.map((logo, index) => (
            <li className="inline-flex" data-logo-measure key={`m-${logo.url}-${index}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="h-12 w-auto max-h-14 max-w-[160px] object-contain lg:h-14"
                height={MAX_LOGO_H}
                src={logo.url}
                width={MAX_LOGO_W}
              />
            </li>
          ))}
        </ul>

        <div
          className={`flex w-full flex-col ${align === 'center' ? 'items-center' : 'items-start'}`}
          style={{ gap: GAP_PX }}
        >
          {rows.map((row, rowIndex) => (
            <ul
              className={`flex flex-wrap ${align === 'center' ? 'justify-center' : 'justify-start'}`}
              key={`row-${rowIndex}`}
              role="list"
              style={{ gap: GAP_PX }}
            >
              {row.map((logo, index) => (
                <LogoCell key={`${logo.url}-${rowIndex}-${index}`} logo={logo} />
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  )
}

'use client'

import { useEffect, useRef } from 'react'

/**
 * Homepage background: scrolls slower than page content (subtle parallax).
 * Used for every site when `SiteShell` gets `backdrop`.
 */
/** Lag vs scroll — 0 = glued to viewport, 1 = normal document scroll. */
const PARALLAX_FACTOR = 0.35

export function HeroBackdrop({
  fitWidth = false,
  src,
}: {
  /** Subsite: 75vh under navbar, object-cover (sides may crop). */
  fitWidth?: boolean
  src?: string | null
} = {}) {
  const imageSrc = src || '/hero-backdrop.svg'
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0

    const clear = () => {
      img.style.transform = ''
    }

    const update = () => {
      raf = 0
      if (reduceMotion.matches) {
        clear()
        return
      }
      const parent = img.parentElement
      // -top-[20%] + h-[140%] → ~20% overhang above/below; only above is usable for lag translate.
      const maxOffset = Math.max(
        0,
        (img.offsetHeight - (parent?.clientHeight ?? 0)) / 2,
      )
      const offset = Math.min(window.scrollY * PARALLAX_FACTOR, maxOffset)
      img.style.transform = offset ? `translate3d(0, ${offset}px, 0)` : ''
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    reduceMotion.addEventListener('change', update)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      reduceMotion.removeEventListener('change', update)
      if (raf) cancelAnimationFrame(raf)
      clear()
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className={
        fitWidth
          ? 'pointer-events-none absolute inset-x-0 top-[var(--site-header-offset,89px)] z-0 h-[75vh] w-full overflow-hidden'
          : 'pointer-events-none absolute inset-x-0 top-0 z-0 min-h-screen w-full overflow-hidden'
      }
      data-component="hero-backdrop"
      data-fit-width={fitWidth ? 'true' : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        alt=""
        className={
          // Taller than clip + negative top → room to lag-scroll without empty gap.
          fitWidth
            ? 'absolute inset-x-0 -top-[20%] h-[140%] w-full object-cover object-top will-change-transform'
            : 'absolute inset-x-0 -top-[20%] h-[140%] min-h-[140vh] w-full object-cover object-top will-change-transform'
        }
        height={1378}
        src={imageSrc}
        width={1512}
      />
    </div>
  )
}

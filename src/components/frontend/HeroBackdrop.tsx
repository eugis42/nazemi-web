'use client'

import { useEffect, useRef } from 'react'

/**
 * Homepage background: scrolls slower than page content (subtle parallax).
 * Used for every site when `SiteShell` gets `backdrop`.
 */
/** Lag vs scroll — 0 = glued to viewport, 1 = normal document scroll. */
const PARALLAX_FACTOR = 0.3
/**
 * Max translate (px). Image is only this much taller than the clip — enough slack
 * so lag does not crop the graphic bottom, without the old 140% zoom.
 */
const PARALLAX_MAX_PX = 64
/** Lerp toward target each frame — higher = snappier, lower = smoother. */
const SMOOTHING = 0.12

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
    let current = 0
    let target = 0
    let raf = 0

    const clear = () => {
      current = 0
      target = 0
      img.style.transform = ''
    }

    const readTarget = () => {
      if (reduceMotion.matches) return 0
      const slack = Math.max(0, img.offsetHeight - (img.parentElement?.clientHeight ?? 0))
      const maxOffset = Math.min(PARALLAX_MAX_PX, slack)
      return Math.min(window.scrollY * PARALLAX_FACTOR, maxOffset)
    }

    const tick = () => {
      raf = 0
      if (reduceMotion.matches) {
        clear()
        return
      }

      target = readTarget()
      current += (target - current) * SMOOTHING
      if (Math.abs(target - current) < 0.15) current = target

      img.style.transform = current ? `translate3d(0, ${current}px, 0)` : ''

      // Keep easing while settling (trackpad / jagged wheel).
      if (current !== target) {
        raf = requestAnimationFrame(tick)
      }
    }

    const onScrollOrResize = () => {
      target = readTarget()
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const onReduceChange = () => {
      if (reduceMotion.matches) {
        clear()
        if (raf) cancelAnimationFrame(raf)
        raf = 0
        return
      }
      onScrollOrResize()
    }

    onScrollOrResize()
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize, { passive: true })
    reduceMotion.addEventListener('change', onReduceChange)

    return () => {
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
      reduceMotion.removeEventListener('change', onReduceChange)
      if (raf) cancelAnimationFrame(raf)
      clear()
    }
  }, [])

  // Pre-parallax framing (object-cover object-top, fill clip) + thin bottom slack only.
  const imgClass = fitWidth
    ? 'w-full object-cover object-top will-change-transform'
    : 'w-full min-h-screen object-cover object-top will-change-transform'

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
        className={imgClass}
        height={1378}
        src={imageSrc}
        style={{ height: `calc(100% + ${PARALLAX_MAX_PX}px)` }}
        width={1512}
      />
    </div>
  )
}

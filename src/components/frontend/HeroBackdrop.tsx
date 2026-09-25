'use client'

import { useEffect, useRef } from 'react'

/**
 * Homepage background: scrolls slower than page content (subtle parallax).
 * Used for every site when `SiteShell` gets `backdrop`.
 *
 * Do not put overflow-x-hidden on this wrapper — CSS then forces overflow-y clip
 * and parallax translateY chops the graphic bottom (esp. subsite / Flowmakers).
 */
/** Lag vs scroll — 0 = glued to viewport, 1 = normal document scroll. */
const PARALLAX_FACTOR = 0.35
/** Cap translate (px). */
const PARALLAX_MAX_PX = 96
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
      return Math.min(window.scrollY * PARALLAX_FACTOR, PARALLAX_MAX_PX)
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

  if (fitWidth) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[var(--site-header-offset,89px)] z-0 w-full"
        data-component="hero-backdrop"
        data-fit-width="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          alt=""
          className="block h-[75vh] w-full object-cover object-top will-change-transform"
          height={1378}
          src={imageSrc}
          width={1512}
        />
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-0 w-full"
      data-component="hero-backdrop"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        alt=""
        className="block h-auto w-full will-change-transform"
        height={1378}
        src={imageSrc}
        width={1512}
      />
    </div>
  )
}

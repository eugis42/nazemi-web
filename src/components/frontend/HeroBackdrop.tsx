'use client'

import { useEffect, useRef } from 'react'

/**
 * Homepage background: scrolls slower than page content (subtle parallax).
 * Used for every site when `SiteShell` gets `backdrop`.
 *
 * SVG sources: inline + stroke-dashoffset line-draw on load (~5s, random order/pace).
 * Bitmap / non-SVG: plain <img> (subsite cover framing unchanged).
 *
 * Do not put overflow-x-hidden on this wrapper — CSS then forces overflow-y clip
 * and parallax translateY chops the graphic bottom (esp. subsite / Flowmakers).
 */
/** Lag vs scroll — 0 = glued to viewport, 1 = normal document scroll. */
const PARALLAX_FACTOR = 0.175
/** Lerp toward target each frame — higher = snappier, lower = smoother. */
const SMOOTHING = 0.12
/** Total window for the staggered line-draw (ms). */
const DRAW_WINDOW_MS = 5000
const DRAW_MIN_MS = 700
const DRAW_MAX_MS = 2800

function isSvgUrl(src: string) {
  return /\.svg([?#]|$)/i.test(src)
}

function graphicClassName(fitWidth: boolean) {
  return fitWidth
    ? 'block h-[75vh] w-full object-cover object-top will-change-transform'
    : // Mobile vh cover (pre-parallax); desktop w-full h-auto full-bleed — see PR #6.
      'block h-[100vh] w-full object-cover object-top will-change-transform md:h-auto'
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Stroke-dash line-draw; no-ops on fill-only / zero-length paths. */
function runLineDraw(svg: SVGSVGElement, reduceMotion: boolean) {
  const paths = [...svg.querySelectorAll('path')].filter((path) => {
    const stroke = path.getAttribute('stroke')
    if (!stroke || stroke === 'none') return false
    try {
      return path.getTotalLength() > 0
    } catch {
      return false
    }
  })

  if (!paths.length) return () => undefined

  if (reduceMotion) {
    for (const path of paths) {
      path.style.strokeDasharray = ''
      path.style.strokeDashoffset = ''
    }
    return () => undefined
  }

  const animations: Animation[] = []
  for (const path of shuffle(paths)) {
    const len = path.getTotalLength()
    path.style.strokeDasharray = String(len)
    path.style.strokeDashoffset = String(len)

    const duration = DRAW_MIN_MS + Math.random() * (DRAW_MAX_MS - DRAW_MIN_MS)
    const delay = Math.random() * Math.max(0, DRAW_WINDOW_MS - duration)

    animations.push(
      path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
        duration,
        delay,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards',
      }),
    )
  }

  return () => {
    for (const anim of animations) anim.cancel()
  }
}

function attachParallax(
  el: HTMLElement | SVGSVGElement,
  reduceMotion: MediaQueryList,
): () => void {
  let current = 0
  let target = 0
  let raf = 0
  /** Freeze translate once the graphic has fully left the viewport. */
  let frozen: number | null = null

  const clear = () => {
    current = 0
    target = 0
    frozen = null
    el.style.transform = ''
  }

  const readTarget = () => {
    if (reduceMotion.matches) return 0

    const rect = el.getBoundingClientRect()
    const visible = rect.bottom > 0 && rect.top < window.innerHeight

    if (!visible) {
      if (rect.bottom <= 0) {
        if (frozen == null) frozen = current
        return frozen
      }
      frozen = null
      return 0
    }

    frozen = null
    return window.scrollY * PARALLAX_FACTOR
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

    el.style.transform = current ? `translate3d(0, ${current}px, 0)` : ''

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
}

export function HeroBackdrop({
  fitWidth = false,
  src,
}: {
  /** Subsite: 75vh under navbar, object-cover (sides may crop). */
  fitWidth?: boolean
  src?: string | null
} = {}) {
  const imageSrc = src || '/hero-backdrop.svg'
  const svgMode = isSvgUrl(imageSrc)
  const wrapClass = fitWidth
    ? 'pointer-events-none absolute inset-x-0 top-[var(--site-header-offset,89px)] z-0 w-full'
    : 'pointer-events-none absolute inset-x-0 top-0 z-0 w-full'
  const graphicClass = graphicClassName(fitWidth)

  const imgRef = useRef<HTMLImageElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let stopParallax: (() => void) | undefined
    let stopDraw: (() => void) | undefined
    let removeReduceDraw: (() => void) | undefined
    let cancelled = false

    const bindParallax = (el: HTMLElement | SVGSVGElement) => {
      stopParallax?.()
      stopParallax = attachParallax(el, reduceMotion)
    }

    if (!svgMode) {
      const img = imgRef.current
      if (img) bindParallax(img)
      return () => {
        stopParallax?.()
      }
    }

    const host = hostRef.current
    if (!host) return undefined

    ;(async () => {
      try {
        const res = await fetch(imageSrc)
        if (!res.ok) throw new Error(`backdrop fetch ${res.status}`)
        const text = await res.text()
        if (cancelled) return

        const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
        const svg = doc.documentElement
        if (!(svg instanceof SVGSVGElement) || doc.querySelector('parsererror')) {
          throw new Error('backdrop SVG parse failed')
        }

        svg.setAttribute('class', graphicClass)
        svg.setAttribute('role', 'presentation')
        svg.setAttribute('aria-hidden', 'true')
        svg.setAttribute('focusable', 'false')
        // Keep intrinsic ratio for md:h-auto full-bleed (same as <img width/height>).
        if (!svg.hasAttribute('width')) svg.setAttribute('width', '1512')
        if (!svg.hasAttribute('height')) svg.setAttribute('height', '1378')

        host.replaceChildren(svg)
        stopDraw = runLineDraw(svg, reduceMotion.matches)
        bindParallax(svg)

        const onReduceDraw = () => {
          stopDraw?.()
          stopDraw = runLineDraw(svg, reduceMotion.matches)
        }
        reduceMotion.addEventListener('change', onReduceDraw)
        removeReduceDraw = () => reduceMotion.removeEventListener('change', onReduceDraw)
      } catch {
        if (cancelled) return
        // Fallback: bitmap-style <img> (no line-draw).
        const img = document.createElement('img')
        img.alt = ''
        img.className = graphicClass
        img.width = 1512
        img.height = 1378
        img.src = imageSrc
        host.replaceChildren(img)
        bindParallax(img)
      }
    })()

    return () => {
      cancelled = true
      stopDraw?.()
      stopParallax?.()
      removeReduceDraw?.()
      host.replaceChildren()
    }
  }, [fitWidth, graphicClass, imageSrc, svgMode])

  if (svgMode) {
    return (
      <div
        aria-hidden="true"
        className={wrapClass}
        data-component="hero-backdrop"
        data-fit-width={fitWidth ? 'true' : undefined}
        data-line-draw="true"
      >
        <div ref={hostRef} />
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className={wrapClass}
      data-component="hero-backdrop"
      data-fit-width={fitWidth ? 'true' : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        alt=""
        className={graphicClass}
        height={1378}
        src={imageSrc}
        width={1512}
      />
    </div>
  )
}

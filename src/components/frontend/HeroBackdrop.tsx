'use client'

import { useEffect, useRef } from 'react'

/**
 * Homepage background: scrolls slower than page content (subtle parallax).
 * Used for every site when `SiteShell` gets `backdrop`.
 *
 * SVG sources: inline + stroke-dashoffset line-draw on load (~3s, random order/pace).
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
const DRAW_WINDOW_MS = 3000
const DRAW_MIN_MS = 500
const DRAW_MAX_MS = 1800

function isSvgUrl(src: string) {
  return /\.svg([?#]|$)/i.test(src)
}

function graphicClassName(fitWidth: boolean) {
  return fitWidth
    ? 'block h-[75vh] w-full object-cover object-top will-change-transform'
    : // Mobile + tablet: vh cover. Desktop (lg+): w-full h-auto full-bleed.
      'block h-[100vh] w-full object-cover object-top will-change-transform lg:h-auto'
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** True if the shape has a visible stroke (attr, inline style, or CSS class). */
function shapeHasStroke(el: SVGGeometryElement): boolean {
  const attr = el.getAttribute('stroke')
  if (attr && attr !== 'none') return true
  const inline = el.style.stroke
  if (inline && inline !== 'none') return true
  // Illustrator exports often put stroke on a CSS class (Flowmakers-bg (1).svg).
  try {
    const computed = getComputedStyle(el).stroke
    return Boolean(
      computed &&
        computed !== 'none' &&
        computed !== 'rgba(0, 0, 0, 0)' &&
        computed !== 'transparent',
    )
  } catch {
    return false
  }
}

/** Random delay/duration plans that still span the full draw window. */
function planTimings(count: number): { delay: number; duration: number }[] {
  if (count <= 0) return []

  // Few strokes (Flowmakers = 1 compound path): occupy the whole window so
  // perceived pace matches multi-path sites (don't finish in ~1s).
  if (count <= 3) {
    const plans = Array.from({ length: count }, (_, i) => {
      const duration =
        count === 1
          ? DRAW_WINDOW_MS
          : DRAW_MIN_MS + Math.random() * (DRAW_WINDOW_MS - DRAW_MIN_MS)
      const maxDelay = Math.max(0, DRAW_WINDOW_MS - duration)
      const delay =
        count === 1 ? 0 : (i / Math.max(1, count - 1)) * maxDelay * (0.4 + Math.random() * 0.6)
      return { delay, duration: Math.min(duration, DRAW_WINDOW_MS - delay) }
    })
    return shuffle(plans)
  }

  // Many strokes: random pace/order, then stretch so the last stroke ends at the window.
  const plans = Array.from({ length: count }, () => {
    const duration = DRAW_MIN_MS + Math.random() * (DRAW_MAX_MS - DRAW_MIN_MS)
    const delay = Math.random() * Math.max(0, DRAW_WINDOW_MS - duration)
    return { delay, duration }
  })

  const minDelay = Math.min(...plans.map((p) => p.delay))
  for (const p of plans) p.delay -= minDelay

  const maxEnd = Math.max(...plans.map((p) => p.delay + p.duration))
  if (maxEnd > 0 && maxEnd < DRAW_WINDOW_MS) {
    const scale = DRAW_WINDOW_MS / maxEnd
    for (const p of plans) {
      p.delay *= scale
      p.duration *= scale
    }
  }

  return shuffle(plans)
}

/** Stroke-dash line-draw; skips fill-only / zero-length shapes. */
function runLineDraw(svg: SVGSVGElement, reduceMotion: boolean) {
  // Must run after SVG is in the document so CSS-class strokes resolve.
  const shapes = [
    ...svg.querySelectorAll<SVGGeometryElement>('path, circle, ellipse, line, polyline, polygon, rect'),
  ].filter((el) => {
    if (!shapeHasStroke(el)) return false
    try {
      return el.getTotalLength() > 0
    } catch {
      return false
    }
  })

  if (!shapes.length) return () => undefined

  if (reduceMotion) {
    for (const el of shapes) {
      el.style.strokeDasharray = ''
      el.style.strokeDashoffset = ''
    }
    return () => undefined
  }

  const ordered = shuffle(shapes)
  const timings = planTimings(ordered.length)
  const animations: Animation[] = []

  for (let i = 0; i < ordered.length; i++) {
    const el = ordered[i]!
    const { delay, duration } = timings[i]!
    const len = el.getTotalLength()
    el.style.strokeDasharray = String(len)
    el.style.strokeDashoffset = String(len)

    animations.push(
      el.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
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
        // Keep intrinsic ratio for lg:h-auto full-bleed (same as <img width/height>).
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

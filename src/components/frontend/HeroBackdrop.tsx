'use client'

import { useEffect, useRef } from 'react'

/**
 * Homepage background: scrolls slower than page content (subtle parallax).
 * Used for every site when `SiteShell` gets `backdrop`.
 *
 * SVG sources: inline + stroke-dashoffset line-draw on load (~3s, random order/pace).
 * Bitmap / non-SVG: plain <img>.
 *
 * Mobile/tablet: 75vh clip frame + cover (sides may crop). Desktop (lg+)
 * main is full-bleed natural height; subsites keep the 75vh cover frame.
 * <img> uses object-cover; inlined SVG uses preserveAspectRatio slice (object-fit
 * is ignored on inline SVG) + a h-full host so the clip box has real height.
 * Overflow is intentional on the 75vh frame only — do not put overflow-x-hidden
 * on page-shell (that forces overflow-y clip and chops parallax outside the frame).
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

function wrapClassName(fitWidth: boolean) {
  const top = fitWidth
    ? 'top-[var(--site-header-offset,89px)]'
    : 'top-0'
  // 75vh clip on mobile/tablet for every site; main drops the clip at lg+.
  if (fitWidth) {
    return `pointer-events-none absolute inset-x-0 ${top} z-0 h-[75vh] w-full overflow-hidden`
  }
  return `pointer-events-none absolute inset-x-0 ${top} z-0 h-[75vh] w-full overflow-hidden lg:h-auto lg:overflow-visible`
}

/** Host fills the clip frame so absolute SVG / img children have a real height. */
function hostClassName(fitWidth: boolean) {
  if (fitWidth) return 'relative h-full w-full'
  return 'relative h-full w-full lg:h-auto'
}

/** <img> — object-fit works. */
function imgGraphicClassName(fitWidth: boolean) {
  if (fitWidth) {
    return 'block h-full w-full object-cover object-top will-change-transform'
  }
  return 'block h-full w-full object-cover object-top will-change-transform lg:h-auto'
}

/**
 * Inline SVG ignores object-fit. Use preserveAspectRatio slice (= cover) inside
 * the 75vh frame; desktop main switches to meet + h-auto full-bleed.
 */
function applyInlineSvgFit(svg: SVGSVGElement, fitWidth: boolean): () => void {
  // Prefer viewBox for aspect; drop fixed px attrs that fight CSS cover.
  if (!svg.getAttribute('viewBox')) {
    const w = svg.getAttribute('width') || '1512'
    const h = svg.getAttribute('height') || '1378'
    svg.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`)
  }
  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.setAttribute('role', 'presentation')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')

  const desktopMq = window.matchMedia('(min-width: 1024px)')

  const apply = () => {
    const desktopBleed = !fitWidth && desktopMq.matches
    if (desktopBleed) {
      // Full-bleed: width 100%, height from viewBox aspect.
      svg.setAttribute('preserveAspectRatio', 'xMidYMin meet')
      svg.setAttribute(
        'class',
        'relative block h-auto w-full will-change-transform',
      )
    } else {
      // Cover the 75vh clip: fill box, crop sides/bottom as needed, top-center.
      svg.setAttribute('preserveAspectRatio', 'xMidYMin slice')
      svg.setAttribute(
        'class',
        'absolute inset-0 block h-full w-full max-w-none will-change-transform',
      )
    }
  }

  apply()
  desktopMq.addEventListener('change', apply)
  return () => desktopMq.removeEventListener('change', apply)
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

/**
 * Stroke-dash line-draw; skips fill-only / zero-length shapes.
 *
 * Caller must insert `svg` into the document first (CSS-class strokes need
 * getComputedStyle) but keep it non-visible until this returns — otherwise
 * getComputedStyle during stroke detect forces a paint of the fully-drawn
 * graphic before dashoffsets are applied, and the draw looks like a no-op.
 */
function runLineDraw(svg: SVGSVGElement, reduceMotion: boolean) {
  const shapes = [
    ...svg.querySelectorAll<SVGGeometryElement>(
      'path, circle, ellipse, line, polyline, polygon, rect',
    ),
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
      el.removeAttribute('pathLength')
    }
    return () => undefined
  }

  const ordered = shuffle(shapes)
  const timings = planTimings(ordered.length)
  const animations: Animation[] = []

  // Prime dashes while still hidden. pathLength=1 → dash units are fraction of
  // path (scale-independent; CSS px vs SVG user-unit mismatch can't hide the draw).
  for (let i = 0; i < ordered.length; i++) {
    const el = ordered[i]!
    el.setAttribute('pathLength', '1')
    el.style.strokeDasharray = '1'
    el.style.strokeDashoffset = '1'
  }

  for (let i = 0; i < ordered.length; i++) {
    const el = ordered[i]!
    const { delay, duration } = timings[i]!
    animations.push(
      el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
        duration,
        delay,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards',
      }),
    )
  }

  return () => {
    // Finish (don't cancel): cancel would snap back to style offset=1 (invisible)
    // if a StrictMode remount races before the next draw primes again.
    for (const anim of animations) {
      try {
        anim.finish()
      } catch {
        anim.cancel()
      }
    }
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
  const wrapClass = wrapClassName(fitWidth)
  const hostClass = hostClassName(fitWidth)
  const imgGraphicClass = imgGraphicClassName(fitWidth)

  const imgRef = useRef<HTMLImageElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let stopParallax: (() => void) | undefined
    let stopDraw: (() => void) | undefined
    let stopSvgFit: (() => void) | undefined
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

        stopSvgFit = applyInlineSvgFit(svg, fitWidth)
        // Hide before mount: shapeHasStroke→getComputedStyle flushes style and can
        // paint one fully-drawn frame before dashoffsets land (= “no animation”).
        svg.style.visibility = 'hidden'
        host.replaceChildren(svg)
        stopDraw = runLineDraw(svg, reduceMotion.matches)
        svg.style.visibility = ''
        bindParallax(svg)

        const onReduceDraw = () => {
          stopDraw?.()
          svg.style.visibility = 'hidden'
          stopDraw = runLineDraw(svg, reduceMotion.matches)
          svg.style.visibility = ''
        }
        reduceMotion.addEventListener('change', onReduceDraw)
        removeReduceDraw = () => reduceMotion.removeEventListener('change', onReduceDraw)
      } catch {
        if (cancelled) return
        // Fallback: bitmap-style <img> (object-fit works).
        const img = document.createElement('img')
        img.alt = ''
        img.className = imgGraphicClass
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
      stopSvgFit?.()
      removeReduceDraw?.()
      host.replaceChildren()
    }
  }, [fitWidth, imgGraphicClass, imageSrc, svgMode])

  if (svgMode) {
    return (
      <div
        aria-hidden="true"
        className={wrapClass}
        data-component="hero-backdrop"
        data-fit-width={fitWidth ? 'true' : undefined}
        data-line-draw="true"
      >
        <div className={hostClass} ref={hostRef} />
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
        className={imgGraphicClass}
        height={1378}
        src={imageSrc}
        width={1512}
      />
    </div>
  )
}

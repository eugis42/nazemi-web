'use client'

import { useEffect, useRef } from 'react'

/**
 * Homepage background for every site when `SiteShell` gets `backdrop`.
 *
 * SVG sources: inline + stroke-dashoffset line-draw on load (~6s, random order/pace).
 * Bitmap / non-SVG: plain <img>.
 *
 * Mobile/tablet: 75vh clip frame + cover (sides may crop). Desktop (lg+)
 * main is full-bleed natural height; subsites keep the 75vh cover frame.
 * <img> uses object-cover; inlined SVG uses preserveAspectRatio slice (object-fit
 * is ignored on inline SVG) + a h-full host so the clip box has real height.
 */
/** Total window for the staggered line-draw (ms). */
const DRAW_WINDOW_MS = 6000
const DRAW_MIN_MS = 1000
const DRAW_MAX_MS = 3600

/** After draw: crawl 1 dashed line per 5 strokes; re-pick every N ms. */
const CRAWL_PER_LINES = 5
/** Time between swaps (dashed hold window). */
const CRAWL_SWAP_MS = 8000
/** Gap morph solid↔dashed (ms). */
const CRAWL_MORPH_MS = 2000
/** One dash+gap cycle duration (ms) — higher = slower march. */
const CRAWL_CYCLE_MS = 8000
/** pathLength-normalized pattern: short dash, gap = half dash. */
const CRAWL_PATH_LENGTH = 100
const CRAWL_DASH = 2
const CRAWL_GAP = CRAWL_DASH / 2

function isSvgUrl(src: string) {
  return /\.svg([?#]|$)/i.test(src)
}

function wrapClassName(fitWidth: boolean) {
  const top = fitWidth
    ? 'top-[var(--site-header-offset,78px)]'
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
    return 'block h-full w-full object-cover object-top'
  }
  return 'block h-full w-full object-cover object-top lg:h-auto'
}

/**
 * Keep line weight in screen px while the backdrop SVG scales (cover / full-bleed).
 * Applied at inline time so CMS-uploaded SVGs get it without re-export.
 */
function applyNonScalingStroke(svg: SVGSVGElement) {
  for (const el of svg.querySelectorAll(
    'path, circle, ellipse, line, polyline, polygon, rect',
  )) {
    el.setAttribute('vector-effect', 'non-scaling-stroke')
  }
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
  // non-scaling-stroke applied after line-draw — during dash anim it skews
  // dashoffset vs path length (main closed paths → start stub / end gap).

  const desktopMq = window.matchMedia('(min-width: 1024px)')

  const apply = () => {
    const desktopBleed = !fitWidth && desktopMq.matches
    if (desktopBleed) {
      // Full-bleed: width 100%, height from viewBox aspect.
      svg.setAttribute('preserveAspectRatio', 'xMidYMin meet')
      svg.setAttribute('class', 'relative block h-auto w-full')
    } else {
      // Cover the 75vh clip: fill box, crop sides/bottom as needed, top-center.
      svg.setAttribute('preserveAspectRatio', 'xMidYMin slice')
      svg.setAttribute(
        'class',
        'absolute inset-0 block h-full w-full max-w-none',
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

/** Solid stroke after draw — clears closed-path dash seam (main hero Z-paths). */
function settleStroke(el: SVGGeometryElement) {
  el.removeAttribute('pathLength')
  el.style.strokeDasharray = 'none'
  el.style.strokeDashoffset = ''
  const prev = el.dataset.heroLinecap
  if (prev) el.setAttribute('stroke-linecap', prev)
  else el.removeAttribute('stroke-linecap')
  delete el.dataset.heroLinecap
}

/**
 * Marching dashes on ~1/5 of strokes; swap random picks every CRAWL_SWAP_MS.
 * Enter/exit: gap morphs 0 ↔ CRAWL_GAP over CRAWL_MORPH_MS (solid ↔ dashed).
 * Skip when fewer than CRAWL_PER_LINES strokes.
 */
function startDashCrawl(shapes: SVGGeometryElement[]): () => void {
  const slots = Math.floor(shapes.length / CRAWL_PER_LINES)
  if (slots <= 0) return () => undefined

  let active: SVGGeometryElement[] = []
  let marchAnims: Animation[] = []
  let timer: ReturnType<typeof setInterval> | undefined
  let stopped = false
  let chain: Promise<void> = Promise.resolve()
  const period = CRAWL_DASH + CRAWL_GAP
  const dashSolid = `${CRAWL_DASH} 0`
  const dashFinal = `${CRAWL_DASH} ${CRAWL_GAP}`

  const clearMarch = () => {
    for (const anim of marchAnims) {
      try {
        anim.cancel()
      } catch {
        /* already ended */
      }
    }
    marchAnims = []
  }

  const solidify = (els: SVGGeometryElement[]) => {
    for (const el of els) {
      el.removeAttribute('pathLength')
      el.style.strokeDasharray = 'none'
      el.style.strokeDashoffset = ''
    }
  }

  const morphGap = (els: SVGGeometryElement[], from: string, to: string) => {
    const anims = els.map((el) =>
      el.animate([{ strokeDasharray: from }, { strokeDasharray: to }], {
        duration: CRAWL_MORPH_MS,
        easing: 'ease-in-out',
        fill: 'forwards',
      }),
    )
    return Promise.all(anims.map((a) => a.finished.catch(() => undefined)))
  }

  const startMarch = (els: SVGGeometryElement[]) => {
    clearMarch()
    for (let i = 0; i < els.length; i++) {
      const el = els[i]!
      el.style.strokeDasharray = dashFinal
      // Alternate crawl direction when several lines dash at once.
      const delta = i % 2 === 0 ? -period : period
      marchAnims.push(
        el.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: delta }], {
          duration: CRAWL_CYCLE_MS,
          easing: 'linear',
          iterations: Infinity,
        }),
      )
    }
  }

  const morphIn = async (els: SVGGeometryElement[]) => {
    for (const el of els) {
      el.setAttribute('pathLength', String(CRAWL_PATH_LENGTH))
      el.style.strokeDashoffset = '0'
      el.style.strokeDasharray = dashSolid
    }
    await morphGap(els, dashSolid, dashFinal)
    if (stopped) return
    startMarch(els)
  }

  const morphOut = async (els: SVGGeometryElement[]) => {
    if (!els.length) return
    clearMarch()
    for (const el of els) {
      el.style.strokeDasharray = dashFinal
    }
    await morphGap(els, dashFinal, dashSolid)
    if (stopped) return
    solidify(els)
  }

  const swap = () => {
    chain = chain.then(async () => {
      if (stopped) return
      const prev = active
      active = []
      await morphOut(prev)
      if (stopped) return
      active = shuffle(shapes).slice(0, slots)
      await morphIn(active)
    })
  }

  active = shuffle(shapes).slice(0, slots)
  void morphIn(active)
  timer = setInterval(swap, CRAWL_SWAP_MS)

  return () => {
    stopped = true
    if (timer != null) clearInterval(timer)
    clearMarch()
    solidify(active)
    active = []
  }
}

/**
 * Stroke-dash line-draw; skips fill-only / zero-length shapes.
 *
 * Caller must insert `svg` into the document first (CSS-class strokes need
 * getComputedStyle) but keep it non-visible until this returns — otherwise
 * getComputedStyle during stroke detect forces a paint of the fully-drawn
 * graphic before dashoffsets are applied, and the draw looks like a no-op.
 *
 * Uses getTotalLength() (not pathLength=1): single-value dasharray "1" becomes
 * dash+gap of equal size; with closed paths + round caps that left a start stub
 * and an end gap on the main hero SVG. Subsites with open paths looked fine.
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

  if (!shapes.length) {
    applyNonScalingStroke(svg)
    return () => undefined
  }

  if (reduceMotion) {
    for (const el of shapes) {
      settleStroke(el)
    }
    applyNonScalingStroke(svg)
    return () => undefined
  }

  const ordered = shuffle(shapes)
  const timings = planTimings(ordered.length)
  const animations: Animation[] = []
  const lengths = ordered.map((el) => el.getTotalLength())
  let stopCrawl: (() => void) | undefined
  let drawCancelled = false

  // Prime dashes while still hidden. Explicit dash+gap (both = length); butt
  // caps so round ends don't peek when offset = length on closed paths.
  for (let i = 0; i < ordered.length; i++) {
    const el = ordered[i]!
    const len = lengths[i]!
    el.removeAttribute('pathLength')
    if (el.dataset.heroLinecap == null) {
      el.dataset.heroLinecap = el.getAttribute('stroke-linecap') ?? ''
    }
    el.setAttribute('stroke-linecap', 'butt')
    el.style.strokeDasharray = `${len} ${len}`
    el.style.strokeDashoffset = `${len}`
  }

  for (let i = 0; i < ordered.length; i++) {
    const el = ordered[i]!
    const len = lengths[i]!
    const { delay, duration } = timings[i]!
    const anim = el.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
      duration,
      delay,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
    })
    anim.finished
      .then(() => {
        settleStroke(el)
      })
      .catch(() => {
        /* cancelled */
      })
    animations.push(anim)
  }

  void Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(() => {
    if (drawCancelled) return
    applyNonScalingStroke(svg)
    stopCrawl = startDashCrawl(shapes)
  })

  return () => {
    drawCancelled = true
    stopCrawl?.()
    stopCrawl = undefined
    // Finish (don't cancel): cancel would snap back to style offset=len (invisible)
    // if a StrictMode remount races before the next draw primes again.
    for (const anim of animations) {
      try {
        anim.finish()
      } catch {
        anim.cancel()
      }
    }
    for (const el of ordered) settleStroke(el)
    applyNonScalingStroke(svg)
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

  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgMode) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let stopDraw: (() => void) | undefined
    let stopSvgFit: (() => void) | undefined
    let removeReduceDraw: (() => void) | undefined
    let cancelled = false

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
      }
    })()

    return () => {
      cancelled = true
      stopDraw?.()
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
        alt=""
        className={imgGraphicClass}
        height={1378}
        src={imageSrc}
        width={1512}
      />
    </div>
  )
}

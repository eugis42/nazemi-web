'use client'

import { useEffect, useRef, type ReactNode } from 'react'

const SPIN_DURATION_S: Record<string, number> = {
  violet: 150,
  orange: 180,
  pink: 140,
}

const ORBIT_DURATION_S = 150
const REVERSE_VARIANTS = new Set(['violet', 'orange', 'pink'])
const VIEWBOX = { h: 923, w: 979 }

type CircleMotion = {
  carrier: SVGGElement
  orbitBaseAngle: number
  orbitRadius: number
  reach: number
  rotator: SVGGElement
  spinAngle: number
  spinSpeed: number
}

type Hub = { lx: number; ly: number }

/** Puts a previously wrapped path back where it was — keeps StrictMode remounts idempotent. */
function unmountCircleMotion(group: SVGGElement) {
  const carrier = group.querySelector('[data-venn-carrier]')
  if (!carrier) return

  const path = carrier.querySelector('path')
  if (path) group.insertBefore(path, carrier)
  carrier.remove()
}

/** Re-parents each circle path into carrier/rotator groups so orbit + spin can be driven per frame. */
function mountCircleMotion(group: SVGGElement, hub: Hub): CircleMotion | null {
  unmountCircleMotion(group)

  const path = group.querySelector('path')
  if (!path || path.parentNode !== group) return null

  group.querySelectorAll('animateTransform').forEach((node) => node.remove())

  const bbox = path.getBBox()
  const cx = bbox.x + bbox.width / 2
  const cy = bbox.y + bbox.height / 2
  const variant = group.dataset.variant ?? 'violet'
  const spinDuration = SPIN_DURATION_S[variant] ?? 150
  const spinReverse = REVERSE_VARIANTS.has(variant)
  const spinSpeed = ((spinReverse ? -1 : 1) * (360 / spinDuration) * Math.PI) / 180

  const dx = cx - hub.lx
  const dy = cy - hub.ly

  const carrier = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  carrier.setAttribute('data-venn-carrier', '')

  const rotator = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  rotator.setAttribute('data-venn-rotator', '')

  const offset = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  offset.setAttribute('transform', `translate(${-cx} ${-cy})`)

  group.insertBefore(carrier, path)
  carrier.appendChild(rotator)
  rotator.appendChild(offset)
  offset.appendChild(path)

  return {
    carrier,
    orbitBaseAngle: Math.atan2(dy, dx),
    orbitRadius: Math.hypot(dx, dy),
    reach: Math.hypot(bbox.width, bbox.height) / 2,
    rotator,
    spinAngle: 0,
    spinSpeed,
  }
}

function measureOrbitBounds(motion: CircleMotion[], hub: Hub, logo: SVGGraphicsElement) {
  const pad = 12
  const logoBox = logo.getBBox()
  let minX = logoBox.x
  let minY = logoBox.y
  let maxX = logoBox.x + logoBox.width
  let maxY = logoBox.y + logoBox.height

  const samples = 16
  for (let i = 0; i < samples; i += 1) {
    const orbitAngle = ((Math.PI * 2) / samples) * i
    motion.forEach((circle) => {
      const orbitRadians = circle.orbitBaseAngle + orbitAngle
      const cx = hub.lx + circle.orbitRadius * Math.cos(orbitRadians)
      const cy = hub.ly + circle.orbitRadius * Math.sin(orbitRadians)
      minX = Math.min(minX, cx - circle.reach)
      minY = Math.min(minY, cy - circle.reach)
      maxX = Math.max(maxX, cx + circle.reach)
      maxY = Math.max(maxY, cy + circle.reach)
    })
  }

  return {
    gutterX: Math.max(pad - minX, maxX - VIEWBOX.w + pad, 0),
    gutterY: Math.max(pad - minY, maxY - VIEWBOX.h + pad, 0),
  }
}

function applyOverflowGutter(
  root: HTMLElement,
  motion: CircleMotion[],
  hub: Hub,
  logo: SVGGraphicsElement,
) {
  const { gutterX, gutterY } = measureOrbitBounds(motion, hub, logo)
  const stage = root.querySelector('.pillars-venn-stage')
  if (!stage) return undefined

  const setGutter = () => {
    const isCompact = window.matchMedia('(max-width: 1023px)').matches
    const stageRect = stage.getBoundingClientRect()
    const scale = stageRect.width / VIEWBOX.w
    const gutterPxX = gutterX * scale
    const gutterPxY = gutterY * scale

    if (isCompact) {
      root.style.setProperty('--venn-gutter-x', '0px')
      root.style.setProperty('--venn-gutter-y', `${gutterPxY}px`)
      return
    }

    const slackX = Math.min(stageRect.left, window.innerWidth - stageRect.right)
    const slackY = Math.min(stageRect.top, window.innerHeight - stageRect.bottom)

    root.style.setProperty('--venn-gutter-x', `${Math.min(gutterPxX, Math.max(0, slackX))}px`)
    root.style.setProperty('--venn-gutter-y', `${Math.min(gutterPxY, Math.max(0, slackY))}px`)
  }

  setGutter()

  if (typeof ResizeObserver === 'undefined') return undefined

  const observer = new ResizeObserver(setGutter)
  observer.observe(stage)
  return observer
}

export function PillarsVennMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const logo = root.querySelector<SVGGraphicsElement>('[data-component="pillars-venn-logo"]')
    if (!logo) return

    const logoBox = logo.getBBox()
    const hub: Hub = {
      lx: logoBox.x + logoBox.width / 2,
      ly: logoBox.y + logoBox.height / 2,
    }

    const circles = root.querySelectorAll<SVGGElement>('[data-component="pillars-venn-circle"]')
    const motion = [...circles]
      .map((group) => mountCircleMotion(group, hub))
      .filter((circle): circle is CircleMotion => circle !== null)

    if (!motion.length) return

    const observer = applyOverflowGutter(root, motion, hub, logo)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      motion.forEach((circle) => {
        const x = hub.lx + circle.orbitRadius * Math.cos(circle.orbitBaseAngle)
        const y = hub.ly + circle.orbitRadius * Math.sin(circle.orbitBaseAngle)
        circle.carrier.setAttribute('transform', `translate(${x} ${y})`)
        circle.rotator.setAttribute('transform', 'rotate(0)')
      })
      return () => {
        observer?.disconnect()
        circles.forEach(unmountCircleMotion)
      }
    }

    const orbitSpeed = ((360 / ORBIT_DURATION_S) * Math.PI) / 180
    let orbitAngle = 0
    let last = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      orbitAngle = (orbitAngle + orbitSpeed * dt) % (Math.PI * 2)

      motion.forEach((circle) => {
        const orbitRadians = circle.orbitBaseAngle + orbitAngle
        const x = hub.lx + circle.orbitRadius * Math.cos(orbitRadians)
        const y = hub.ly + circle.orbitRadius * Math.sin(orbitRadians)

        circle.spinAngle = (circle.spinAngle + circle.spinSpeed * dt) % (Math.PI * 2)
        circle.carrier.setAttribute('transform', `translate(${x} ${y})`)
        circle.rotator.setAttribute('transform', `rotate(${(circle.spinAngle * 180) / Math.PI})`)
      })

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
      circles.forEach(unmountCircleMotion)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pillars-venn-wrap" data-component="pillars-venn" ref={rootRef}>
      {children}
    </div>
  )
}

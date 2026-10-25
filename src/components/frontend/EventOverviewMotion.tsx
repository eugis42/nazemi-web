'use client'

import { useLayoutEffect, type ReactNode } from 'react'

/**
 * Sticky bar + refine media square to text-column height on lg+.
 * First paint uses CSS fallback (`.event-overview-media`); this only adjusts —
 * never zeroes width (that caused a visible flash).
 */
export function EventOverviewMotion({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-component="event-overview"]')
    if (!root) return undefined

    const sticky = root.querySelector<HTMLElement>('[data-event-overview-sticky]')
    const hero = root.querySelector<HTMLElement>('[data-event-overview-hero]')
    if (!sticky || !hero) return undefined

    const media = hero.querySelector<HTMLElement>('.event-overview-media')
    const body = media?.nextElementSibling as HTMLElement | null
    const header = document.querySelector<HTMLElement>('[data-component="site-header"]')
    const rowQuery = window.matchMedia('(min-width: 1024px)')
    let observer: ResizeObserver | undefined
    let lastAppliedSize = 0

    function headerOffset() {
      const fromVar = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--site-header-offset'),
      )
      if (Number.isFinite(fromVar) && fromVar > 0) return fromVar
      return header ? header.offsetHeight : 89
    }

    function clearMediaSize() {
      if (!media) return
      media.style.width = ''
      media.style.height = ''
      lastAppliedSize = 0
    }

    function applyMediaSize(size: number) {
      if (!media || size <= 0 || size === lastAppliedSize) return
      media.style.width = `${size}px`
      media.style.height = `${size}px`
      lastAppliedSize = size
    }

    function syncMediaSize() {
      if (!media || !body) return
      if (!rowQuery.matches) {
        clearMediaSize()
        observer?.disconnect()
        return
      }
      applyMediaSize(Math.round(body.getBoundingClientRect().height))
      if (observer) observer.observe(body)
    }

    function syncSticky() {
      if (!sticky || !hero) return
      const offset = headerOffset()
      document.documentElement.style.setProperty('--event-sticky-top', `${offset}px`)
      sticky.style.top = `${offset}px`
      const visible = hero.getBoundingClientRect().bottom <= offset
      sticky.classList.toggle('is-visible', visible)
      sticky.setAttribute('aria-hidden', visible ? 'false' : 'true')
    }

    function refresh() {
      syncMediaSize()
      syncSticky()
    }

    if (body && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (!rowQuery.matches) return
        syncMediaSize()
      })
    }

    refresh()
    window.addEventListener('scroll', syncSticky, { passive: true })
    window.addEventListener('resize', refresh, { passive: true })
    rowQuery.addEventListener('change', refresh)
    void Promise.resolve(document.fonts?.ready).then(refresh)

    return () => {
      window.removeEventListener('scroll', syncSticky)
      window.removeEventListener('resize', refresh)
      rowQuery.removeEventListener('change', refresh)
      observer?.disconnect()
      clearMediaSize()
    }
  }, [])

  return <>{children}</>
}

'use client'

import { useEffect, type ReactNode } from 'react'

/**
 * Port of the design `event-detail.js`: swaps the hero overview for a sticky bar once
 * the hero scrolls under the site header, and keeps the square media as tall as the body.
 */
export function EventOverviewMotion({ children }: { children: ReactNode }) {
  useEffect(() => {
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
    let measureFrame = 0
    let lastAppliedSize = 0
    let measuring = false

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
      media.style.minWidth = ''
      media.style.flexBasis = ''
      lastAppliedSize = 0
    }

    function applyMediaSize(size: number) {
      if (!media || size <= 0 || size === lastAppliedSize) return
      media.style.flexBasis = ''
      media.style.minWidth = ''
      media.style.width = `${size}px`
      media.style.height = `${size}px`
      lastAppliedSize = size
    }

    function readBodyHeight() {
      return Math.round(body?.getBoundingClientRect().height ?? 0)
    }

    function updateMediaSize() {
      if (!media || !body || !rowQuery.matches) return
      applyMediaSize(readBodyHeight())
    }

    function measureInitialMediaSize() {
      if (!media || !body || measuring) return
      measuring = true
      cancelAnimationFrame(measureFrame)
      observer?.disconnect()

      media.style.flexBasis = '0'
      media.style.minWidth = '0'
      media.style.width = '0'
      media.style.height = 'auto'

      measureFrame = requestAnimationFrame(() => {
        measureFrame = requestAnimationFrame(() => {
          applyMediaSize(readBodyHeight())
          measuring = false
          if (body && typeof ResizeObserver !== 'undefined') {
            observer?.observe(body)
          }
        })
      })
    }

    function syncOverviewMediaSize({ initial = false } = {}) {
      if (!media || !body) return
      if (!rowQuery.matches) {
        clearMediaSize()
        observer?.disconnect()
        return
      }
      if (initial || lastAppliedSize === 0) {
        measureInitialMediaSize()
        return
      }
      updateMediaSize()
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

    function refresh({ initial = false } = {}) {
      syncOverviewMediaSize({ initial })
      syncSticky()
    }

    function onResize() {
      refresh()
    }

    function onRowChange() {
      refresh({ initial: true })
    }

    window.addEventListener('scroll', syncSticky, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    rowQuery.addEventListener('change', onRowChange)

    if (body && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (!rowQuery.matches || lastAppliedSize === 0) return
        updateMediaSize()
      })
    }

    const image = media?.querySelector('img')

    void Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      image?.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image?.addEventListener('load', () => resolve(), { once: true })
          }),
    ]).then(() => {
      if (lastAppliedSize > 0) {
        updateMediaSize()
        syncSticky()
        return
      }
      refresh({ initial: true })
    })

    return () => {
      cancelAnimationFrame(measureFrame)
      window.removeEventListener('scroll', syncSticky)
      window.removeEventListener('resize', onResize)
      rowQuery.removeEventListener('change', onRowChange)
      observer?.disconnect()
      clearMediaSize()
    }
  }, [])

  return <>{children}</>
}

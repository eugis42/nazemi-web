'use client'

import { useEffect, type ReactNode } from 'react'

/**
 * Port of the design `workshop-detail.js`: reveals the sticky workshop summary once the
 * hero scrolls under the site header. Mirrors the event overview sticky timing.
 */
export function WorkshopHeaderMotion({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-component="workshop-header"]')
    if (!root) return undefined

    const sticky = root.querySelector<HTMLElement>('[data-workshop-header-sticky]')
    const hero = root.querySelector<HTMLElement>('[data-workshop-header-hero]')
    if (!sticky || !hero) return undefined

    const header = document.querySelector<HTMLElement>('[data-component="site-header"]')

    function headerOffset() {
      const fromVar = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--site-header-offset'),
      )
      if (Number.isFinite(fromVar) && fromVar > 0) return fromVar
      return header ? header.offsetHeight : 89
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

    syncSticky()
    window.addEventListener('scroll', syncSticky, { passive: true })
    window.addEventListener('resize', syncSticky, { passive: true })
    void Promise.resolve(document.fonts?.ready).then(syncSticky)

    return () => {
      window.removeEventListener('scroll', syncSticky)
      window.removeEventListener('resize', syncSticky)
    }
  }, [])

  return <>{children}</>
}

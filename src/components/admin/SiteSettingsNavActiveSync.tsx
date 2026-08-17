'use client'

import { useEffect } from 'react'

import {
  SITE_SETTINGS_QUERY,
  SITE_SETTINGS_TABS,
  type SiteSettingsTabKey,
} from '@/lib/site-settings-nav'

const SETTINGS_NAV_IDS: Record<SiteSettingsTabKey, string> = {
  navigace: 'nav-site-navigace',
  kontakt: 'nav-site-kontakt',
  paticka: 'nav-site-paticka',
}

const SITES_NAV_ID = 'nav-sites'
const INDICATOR_CLASS = 'nav__link-indicator'

function getFocusTabKey(): SiteSettingsTabKey | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get(SITE_SETTINGS_QUERY)
  if (value && value in SITE_SETTINGS_TABS) {
    return value as SiteSettingsTabKey
  }
  return null
}

function ensureIndicator(el: HTMLElement | null, on: boolean) {
  if (!el) return
  const existing = el.querySelector(`.${INDICATOR_CLASS}`)
  if (on && !existing) {
    const div = document.createElement('div')
    div.className = INDICATOR_CLASS
    el.insertBefore(div, el.firstChild)
  } else if (!on && existing) {
    existing.remove()
  }
}

/**
 * Settings edits live under `/collections/sites/:id?siteSettings=…`, so Payload
 * marks Weby active. Move the nav indicator to Navigace / Kontakt / Patička.
 *
 * No `next/navigation` hooks — Payload `beforeNav` client islands avoid those hooks.
 */
export function SiteSettingsNavActiveSync() {
  useEffect(() => {
    let raf = 0
    let debounceId = 0
    let observer: MutationObserver | undefined

    const apply = () => {
      const focusKey = getFocusTabKey()
      const sitesEl = document.getElementById(SITES_NAV_ID)
      const pathname = window.location.pathname

      if (focusKey) {
        ensureIndicator(sitesEl, false)
        for (const [key, id] of Object.entries(SETTINGS_NAV_IDS) as [
          SiteSettingsTabKey,
          string,
        ][]) {
          ensureIndicator(document.getElementById(id), key === focusKey)
        }
        return
      }

      for (const id of Object.values(SETTINGS_NAV_IDS)) {
        ensureIndicator(document.getElementById(id), false)
      }

      ensureIndicator(sitesEl, pathname.includes('/collections/sites'))
    }

    const schedule = () => {
      window.clearTimeout(debounceId)
      debounceId = window.setTimeout(apply, 16)
    }

    const attach = () => {
      cancelAnimationFrame(raf)
      apply()
      const wrap = document.querySelector('.nav__wrap')
      if (!wrap) {
        raf = requestAnimationFrame(attach)
        return
      }
      observer?.disconnect()
      observer = new MutationObserver(schedule)
      observer.observe(wrap, { childList: true, subtree: true })
    }

    attach()
    window.addEventListener('popstate', schedule)

    // App Router soft navigations may not fire popstate
    let lastKey = `${window.location.pathname}?${window.location.search}`
    const urlPoll = window.setInterval(() => {
      const key = `${window.location.pathname}?${window.location.search}`
      if (key !== lastKey) {
        lastKey = key
        apply()
      }
    }, 200)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(debounceId)
      window.clearInterval(urlPoll)
      window.removeEventListener('popstate', schedule)
      observer?.disconnect()
    }
  }, [])

  return null
}

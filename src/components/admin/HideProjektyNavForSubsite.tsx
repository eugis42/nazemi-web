'use client'

import { useEffect } from 'react'

import { ADMIN_SITE_COOKIE, MAIN_SITE_SLUG, getCookieValue } from '@/lib/site-context'

function getCookieAdminSiteSlug(): string {
  if (typeof document === 'undefined') {
    return MAIN_SITE_SLUG
  }
  return getCookieValue(document.cookie, ADMIN_SITE_COOKIE) || MAIN_SITE_SLUG
}

function applyProjektyNavVisibility() {
  const el = document.getElementById('nav-projekty')
  if (!(el instanceof HTMLElement)) {
    return
  }
  const isMain = getCookieAdminSiteSlug() === MAIN_SITE_SLUG
  el.style.display = isMain ? '' : 'none'
}

/**
 * Projekty are main-site only; hide the sidebar entry when a sub-site is selected in admin.
 */
export function HideProjektyNavForSubsite() {
  useEffect(() => {
    let raf = 0
    let observer: MutationObserver | undefined

    const attach = () => {
      cancelAnimationFrame(raf)
      applyProjektyNavVisibility()
      const wrap = document.querySelector('.nav__wrap')
      if (!wrap) {
        raf = requestAnimationFrame(attach)
        return
      }
      observer = new MutationObserver(() => {
        applyProjektyNavVisibility()
      })
      observer.observe(wrap, { childList: true, subtree: true })
    }

    attach()

    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [])

  return null
}

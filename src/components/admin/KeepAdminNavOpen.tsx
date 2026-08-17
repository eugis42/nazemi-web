'use client'

import { useNav, useWindowInfo } from '@payloadcms/ui'
import { useEffect, useRef } from 'react'

const USER_COLLAPSED_KEY = 'nazemi-admin-nav-user-collapsed'
/** Payload mid breakpoint — above this, sidebar is permanent (not a modal). */
const DESKTOP_MQ = '(min-width: 1025px)'

function readUserCollapsed(): boolean {
  try {
    return sessionStorage.getItem(USER_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function writeUserCollapsed(collapsed: boolean) {
  try {
    sessionStorage.setItem(USER_COLLAPSED_KEY, collapsed ? '1' : '0')
  } catch {
    // ignore
  }
}

function isDesktopSidebar(): boolean {
  return window.matchMedia(DESKTOP_MQ).matches
}

function isNavDomOpen(): boolean {
  return Boolean(document.querySelector('.nav.nav--nav-open'))
}

/**
 * Payload `NavProvider` closes the sidebar when `largeBreak` matches (≤1440px).
 * Re-open after that — but respect intentional hamburger collapse until the user expands again.
 */
export function KeepAdminNavOpen() {
  const { navOpen, setNavOpen } = useNav()
  const {
    breakpoints: { m: midBreak, s: smallBreak },
  } = useWindowInfo()
  const userCollapsedRef = useRef(false)

  useEffect(() => {
    userCollapsedRef.current = readUserCollapsed()
  }, [])

  useEffect(() => {
    const onTogglerClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (!target.closest('#nav-toggler, .nav-toggler')) return
      if (!isDesktopSidebar()) return

      // Click runs before Payload flips state: open → user is collapsing
      const collapsing = isNavDomOpen()
      userCollapsedRef.current = collapsing
      writeUserCollapsed(collapsing)
    }

    document.addEventListener('click', onTogglerClick, true)
    return () => {
      document.removeEventListener('click', onTogglerClick, true)
    }
  }, [])

  useEffect(() => {
    if (typeof midBreak !== 'boolean' || typeof smallBreak !== 'boolean') {
      return
    }

    // ≤1024px: modal nav — leave Payload behaviour alone
    if (midBreak || smallBreak) {
      return
    }

    if (!navOpen && !userCollapsedRef.current) {
      setNavOpen(true)
    }
  }, [navOpen, midBreak, smallBreak, setNavOpen])

  return null
}

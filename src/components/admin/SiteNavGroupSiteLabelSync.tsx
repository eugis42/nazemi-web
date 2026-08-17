'use client'

import { useEffect } from 'react'

import {
  ADMIN_NAV_SITE_CONTENT,
  ADMIN_NAV_SITE_SETTINGS,
} from '@/lib/admin-nav-groups'

const SITE_GROUP_BASES = [ADMIN_NAV_SITE_CONTENT, ADMIN_NAV_SITE_SETTINGS] as const

function labelForBase(base: string, siteName: string): string {
  const name = siteName.trim()
  return name ? `${base} ${name}` : base
}

function matchSiteGroupBase(text: string): (typeof SITE_GROUP_BASES)[number] | null {
  for (const base of SITE_GROUP_BASES) {
    if (text === base || text.startsWith(`${base} `)) {
      return base
    }
  }
  return null
}

/**
 * Payload `admin.group` is static. Rewrite site-scoped group labels to include
 * active site name, and mark the last site-scoped group for the global divider.
 */
export function SiteNavGroupSiteLabelSync({ siteName }: { siteName: string }) {
  useEffect(() => {
    const currentName = siteName

    function apply() {
      const wrap = document.querySelector('.nav__wrap')
      if (!wrap) return

      const groups = [...wrap.querySelectorAll(':scope > .nav-group')]
      groups.forEach((group) => {
        group.classList.remove('nazemi-nav-group--site-scoped', 'nazemi-nav-group--site-end')
      })

      let lastSiteGroup: Element | null = null

      for (const group of groups) {
        if (group instanceof HTMLElement && group.classList.contains('nazemi-nav-hidden')) continue
        const label = group.querySelector('.nav-group__label')
        if (!(label instanceof HTMLElement)) continue

        const text = label.textContent?.trim() ?? ''
        const base = matchSiteGroupBase(text)
        if (!base) continue

        const full = labelForBase(base, currentName)
        if (text !== full) {
          label.textContent = full
        }
        group.classList.add('nazemi-nav-group--site-scoped')
        lastSiteGroup = group
      }

      lastSiteGroup?.classList.add('nazemi-nav-group--site-end')
    }

    let raf = 0
    let observer: MutationObserver | undefined

    const attach = () => {
      cancelAnimationFrame(raf)
      apply()
      const wrap = document.querySelector('.nav__wrap')
      if (!wrap) {
        raf = requestAnimationFrame(attach)
        return
      }
      observer = new MutationObserver(() => {
        apply()
      })
      observer.observe(wrap, { characterData: true, childList: true, subtree: true })
    }

    attach()

    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [siteName])

  return null
}

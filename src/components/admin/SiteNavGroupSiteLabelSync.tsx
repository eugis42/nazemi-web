'use client'

import { useEffect } from 'react'

import { ADMIN_NAV_SITE_CONTENT } from '@/lib/admin-nav-groups'

/**
 * Payload nav group labels come from static config (`admin.group` = "Obsah webu").
 * We replace the first sidebar group label (Obsah webu) with the active site name only.
 */
export function SiteNavGroupSiteLabelSync({ siteName }: { siteName: string }) {
  useEffect(() => {
    const base = ADMIN_NAV_SITE_CONTENT
    const currentName = siteName

    function apply() {
      const wrap = document.querySelector('.nav__wrap')
      const firstGroup = wrap?.querySelector('.nav-group')
      const label = firstGroup?.querySelector('.nav-group__label')
      if (!(label instanceof HTMLElement)) {
        return
      }

      const name = currentName.trim()
      const full = name || base
      const t = label.textContent?.trim() ?? ''
      if (t !== full) {
        label.textContent = full
      }
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
